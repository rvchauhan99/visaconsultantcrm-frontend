/** Jest stub — react-router-dom v7 exports break CRA Jest resolution. */
let _params = new URLSearchParams();
let _setSearchParams = (next) => {
  if (typeof next === "function") _params = next(_params);
  else _params = new URLSearchParams(next);
};

export function __setMockSearchParams(init = "") {
  _params = new URLSearchParams(init);
}

export function __getMockSearchParams() {
  return _params;
}

export function __setMockSetSearchParams(fn) {
  _setSearchParams = fn;
}

export function useSearchParams() {
  return [_params, _setSearchParams];
}

export function MemoryRouter({ children }) {
  return children;
}

export function Link({ children, to, ...rest }) {
  return (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children}
    </a>
  );
}
