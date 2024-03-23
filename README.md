# auto-frame-component

An iframe component that automatically syncs styles from the host.

An implementation of [react-frame-component](https://github.com/ryanseddon/react-frame-component).

## Quick start

```sh
npm i @measured/auto-frame-component
```

```jsx
import AutoFrame from "@measured/auto-frame-component";

export function Page() {
  return (
    <AutoFrame>
      {/* Hero class exists on parent */}
      <div className="Hero">Hello, world</div>
    </AutoFrame>
  );
}
```

## API

Shares an API with [react-frame-component](https://github.com/ryanseddon/react-frame-component), and exposes some additional props.

### debug

`debug: boolean`

Print debug messages when mounting styles to the console

### onStylesLoaded

`onStylesLoaded: function`

A callback that triggers when the initial styles [are loaded](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#stylesheet_load_events)

## License

MIT © [Measured Corporation Ltd](https://measured.co)
