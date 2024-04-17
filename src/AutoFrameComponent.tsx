import React, { ReactNode, useEffect } from "react";
import Frame, { FrameComponentProps, useFrame } from "react-frame-component";
import hash from "object-hash";

const styleSelector = 'style, link[as="style"], link[rel="stylesheet"]';

const collectStyles = (doc: Document) => {
  const collected: HTMLElement[] = [];

  doc.head.querySelectorAll(styleSelector).forEach((style) => {
    collected.push(style as HTMLElement);
  });

  return collected;
};

const getStyleSheet = (el: HTMLElement) => {
  return Array.from(document.styleSheets).find((ss) => {
    const ownerNode = ss.ownerNode as HTMLLinkElement;

    return ownerNode.href === (el as HTMLLinkElement).href;
  });
};

const getStyles = (styleSheet?: CSSStyleSheet) => {
  if (styleSheet) {
    try {
      return [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
    } catch (e) {
      console.warn(
        "Access to stylesheet %s is denied. Ignoring…",
        styleSheet.href
      );
    }
  }

  return "";
};

const defer = (fn: () => void) => setTimeout(fn, 0);

const CopyHostStyles = ({
  children,
  debug = false,
  onStylesLoaded = () => null,
}: {
  children: ReactNode;
  debug?: boolean;
  onStylesLoaded?: () => void;
}) => {
  const { document: doc, window: win } = useFrame();

  useEffect(() => {
    if (!win || !doc) {
      return () => {};
    }

    let elements: { original: HTMLElement; mirror: HTMLElement }[] = [];
    const hashes: Record<string, boolean> = {};

    const lookupEl = (el: HTMLElement) =>
      elements.findIndex((elementMap) => elementMap.original === el);

    const mirrorEl = async (el: HTMLElement, onLoad: () => void = () => {}) => {
      let mirror: HTMLStyleElement;

      if (el.nodeName === "LINK") {
        mirror = document.createElement("style") as HTMLStyleElement;
        mirror.type = "text/css";

        let styleSheet = getStyleSheet(el);

        if (!styleSheet) {
          await new Promise<void>((resolve) => {
            const fn = () => {
              resolve();
              el.removeEventListener("load", fn);
            };

            el.addEventListener("load", fn);
          });
          styleSheet = getStyleSheet(el);
        }

        const styles = getStyles(styleSheet);

        if (!styles) {
          if (debug) {
            console.warn(
              `Tried to load styles for link element, but couldn't find them. Skipping...`
            );
          }

          return;
        }

        mirror.innerHTML = styles;

        mirror.setAttribute("data-href", el.getAttribute("href")!);
      } else {
        mirror = el.cloneNode(true) as HTMLStyleElement;
      }

      mirror.onload = onLoad;

      return mirror;
    };

    const addEl = async (el: HTMLElement, onLoad: () => void = () => {}) => {
      const index = lookupEl(el);
      if (index > -1) {
        if (debug)
          console.log(
            `Tried to add an element that was already mirrored. Updating instead...`
          );

        elements[index].mirror.innerText = el.innerText;

        onLoad();

        return;
      }

      const mirror = await mirrorEl(el, onLoad);

      if (!mirror) {
        onLoad();

        return;
      }

      const elHash = hash(mirror.outerHTML);

      if (hashes[elHash]) {
        if (debug)
          console.log(
            `iframe already contains element that is being mirrored. Skipping...`
          );

        onLoad();

        return;
      }

      hashes[elHash] = true;

      mirror.onload = onLoad;

      doc.head.append(mirror as HTMLElement);
      elements.push({ original: el, mirror: mirror });

      if (debug) console.log(`Added style node ${el.outerHTML}`);
    };

    const removeEl = (el: HTMLElement) => {
      const index = lookupEl(el);
      if (index === -1) {
        if (debug)
          console.log(
            `Tried to remove an element that did not exist. Skipping...`
          );

        return;
      }

      const elHash = hash(el.outerHTML);

      elements[index]?.mirror?.remove();
      delete hashes[elHash];

      if (debug) console.log(`Removed style node ${el.outerHTML}`);
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === Node.TEXT_NODE ||
              node.nodeType === Node.ELEMENT_NODE
            ) {
              const el =
                node.nodeType === Node.TEXT_NODE
                  ? node.parentElement
                  : (node as HTMLElement);

              if (el && el.matches(styleSelector)) {
                defer(() => addEl(el));
              }
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (
              node.nodeType === Node.TEXT_NODE ||
              node.nodeType === Node.ELEMENT_NODE
            ) {
              const el =
                node.nodeType === Node.TEXT_NODE
                  ? node.parentElement
                  : (node as HTMLElement);

              if (el && el.matches(styleSelector)) {
                defer(() => removeEl(el));
              }
            }
          });
        }
      });
    });

    const parentDocument = win!.parent.document;

    const collectedStyles = collectStyles(parentDocument);
    const hrefs: string[] = [];

    Promise.all(
      collectedStyles.map(async (styleNode, i) => {
        if (styleNode.nodeName === "LINK") {
          const linkHref = (styleNode as HTMLLinkElement).href;

          // Don't process link elements with identical hrefs more than once
          if (hrefs.indexOf(linkHref) > -1) {
            return;
          }

          hrefs.push(linkHref);
        }

        const mirror = await mirrorEl(styleNode);

        if (!mirror) return;

        elements.push({ original: styleNode, mirror });

        return mirror;
      })
    ).then((mirrorStyles) => {
      const filtered = mirrorStyles.filter(
        (el) => typeof el !== "undefined"
      ) as HTMLStyleElement[];

      // Reset HTML (inside the promise) so in case running twice (i.e. for React Strict mode)
      doc.head.innerHTML = "";

      // Inject initial values in bulk
      doc.head.append(...filtered);

      observer.observe(parentDocument.head, { childList: true, subtree: true });

      filtered.forEach((el) => {
        const elHash = hash(el.outerHTML);

        hashes[elHash] = true;
      });

      onStylesLoaded();
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
};

export type AutoFrameProps = FrameComponentProps & {
  debug?: boolean;
  onStylesLoaded?: () => void;
};

const AutoFrameComponent = React.forwardRef<HTMLIFrameElement, AutoFrameProps>(
  function (
    { children, debug, onStylesLoaded, ...props }: AutoFrameProps,
    ref
  ) {
    return (
      <Frame {...props} ref={ref}>
        <CopyHostStyles debug={debug} onStylesLoaded={onStylesLoaded}>
          {children}
        </CopyHostStyles>
      </Frame>
    );
  }
);

AutoFrameComponent.displayName = "AutoFrameComponent";

export default AutoFrameComponent;
