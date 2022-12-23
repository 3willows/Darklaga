import * as X from "./x"

export function A() {
    return X.f();
}

document.write(A().toFixed());
