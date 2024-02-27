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

Shares an API with [react-frame-component](https://github.com/ryanseddon/react-frame-component).

## License

MIT © [Measured Corporation Ltd](https://measured.co)
