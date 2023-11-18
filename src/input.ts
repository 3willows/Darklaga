export const key = { 
    up: false,
    left: false,
    down: false,
    right: false,
    action: false,
    action2: false
}

function onKey(setTo: boolean) {
    return function(e: KeyboardEvent) {
        switch (e.key) {

            case "ArrowUp":
            case "w":
            case "z": 
                key.up = setTo; 
                break;

            case "ArrowLeft":
            case "q":
            case "a": 
                key.left = setTo; 
                break;

            case "ArrowDown": 
            case "s": 
                key.down = setTo;
                break;

            case "ArrowRight": 
            case "d": 
                key.right = setTo;
                break;

            case "x":
            case "Enter":
                key.action = setTo;
                break;

            case " ":
                key.action2 = setTo;
                break;
        }
    }
}

export const mouse = {
    x: 0,
    y: 0,
    down: false
}

const canvas = document.getElementById("gl")!;

function onMouse(e: MouseEvent) {
    const r = canvas.getBoundingClientRect();
    mouse.x = Math.max(0, Math.min(r.width, e.clientX - r.left)) * (240 / r.width);
    mouse.y = Math.max(0, Math.min(r.height, e.clientY - r.top)) * (320 / r.height);
    e.preventDefault();
}

document.addEventListener("keydown", onKey(true))
document.addEventListener("keyup", onKey(false))
document.addEventListener("mousemove", onMouse)
document.addEventListener("mousedown", e => { mouse.down = true ; e.preventDefault() });
document.addEventListener("mouseup", e => { mouse.down = false ; e.preventDefault() });
