import React, { ReactNode, useLayoutEffect } from "react";
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
  return Array.from(document.styleSheets).find((ss) => ss.ownerNode === el);
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

  useLayoutEffect(() => {
    if (!win || !doc) {
      return () => {};
    }

    const elements: { original: HTMLElement; mirror: HTMLElement }[] = [];

    const lookupEl = (el: HTMLElement) =>
      elements.findIndex((elementMap) => elementMap.original === el);

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

      let mirror;

      if (el.nodeName === "LINK") {
        mirror = document.createElement("style") as HTMLStyleElement;
        mirror.type = "text/css";

        let styleSheet = getStyleSheet(el);

        if (!styleSheet) {
          await new Promise((resolve) => (el.onload = resolve));
          styleSheet = getStyleSheet(el);
        }

        const styles = getStyles(styleSheet);

        if (!styles) {
          if (debug) {
            console.warn(
              `Tried to load styles for link element, but couldn't find them. Skipping...`
            );
          }

          onLoad();

          return;
        }

        mirror.innerHTML = styles;

        mirror.setAttribute("data-href", el.getAttribute("href")!);
      } else {
        mirror = el.cloneNode(true);
      }

      const elHash = hash(mirror.outerHTML);

      //   Check if any existing iframe nodes match this element
      const existingHashes = collectStyles(doc)
        .map(
          (existingStyle) =>
            existingStyle !== mirror && hash(existingStyle.outerHTML)
        )
        .filter(Boolean);

      if (existingHashes.indexOf(elHash) > -1) {
        if (debug)
          console.log(
            `iframe already contains element that is being mirrored. Skipping...`
          );

        onLoad();

        return;
      }

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

      elements[index].mirror.remove();

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
                addEl(el);
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
                removeEl(el);
              }
            }
          });
        }
      });
    });

    const parentDocument = win!.parent.document;

    const collectedStyles = collectStyles(parentDocument);

    let mountedCounter = 0;

    collectedStyles.forEach((styleNode) => {
      addEl(styleNode as HTMLElement, () => {
        mountedCounter += 1;

        if (mountedCounter === collectedStyles.length) {
          onStylesLoaded();
        }
      });
    });

    observer.observe(parentDocument.head, { childList: true, subtree: true });

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

export default React.forwardRef<HTMLIFrameElement, AutoFrameProps>(function (
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
});
