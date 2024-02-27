import React, { ReactNode, useLayoutEffect } from "react";
import Frame, { FrameComponentProps, useFrame } from "react-frame-component";
import hash from "object-hash";

const styleSelector = 'style, link[as="style"], link[rel="stylesheet"]';

const collectStyles = (doc: Document) => {
  const collected: Node[] = [];

  doc.head.querySelectorAll(styleSelector).forEach((style) => {
    collected.push(style);
  });

  return collected;
};

const CopyHostStyles = ({ children }: { children: ReactNode }) => {
  const { document: doc, window: win } = useFrame();

  useLayoutEffect(() => {
    if (!win) {
      return () => {};
    }

    const add = (el: HTMLElement, contentHash: string = hash(el.outerHTML)) => {
      if (doc?.head.querySelector(`[data-content-hash="${contentHash}"]`)) {
        console.log(
          `Style tag with same content (${contentHash}) already exists, skpping...`
        );

        return;
      }

      console.log(
        `Added style node with content hash ${contentHash} ${el.innerHTML}`
      );

      const frameStyles = el.cloneNode(true);

      (frameStyles as HTMLElement).setAttribute(
        "data-content-hash",
        contentHash
      );

      doc?.head.append(frameStyles);
    };

    const remove = (el: HTMLElement) => {
      const contentHash = hash(el.textContent);
      const frameStyles = el.cloneNode(true);

      (frameStyles as HTMLElement).setAttribute(
        "data-content-hash",
        contentHash
      );

      console.log(
        `Removing node with content hash ${contentHash} as no longer present in parent`
      );

      doc?.head.querySelector(`[data-content-hash="${contentHash}"]`)?.remove();
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
                add(el);
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
                remove(el);
              }
            }
          });
        }
      });
    });

    const parentDocument = win!.parent.document;

    observer.observe(parentDocument.head, { childList: true, subtree: true });

    const collectedStyles = collectStyles(parentDocument);

    // Add new style tags
    collectedStyles.forEach((styleNode) => {
      add(styleNode as HTMLElement);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
};

export default React.forwardRef<HTMLIFrameElement, FrameComponentProps>(
  function ({ children, ...props }: FrameComponentProps, ref) {
    return (
      <Frame {...props} ref={ref}>
        <CopyHostStyles>{children}</CopyHostStyles>
      </Frame>
    );
  }
);
