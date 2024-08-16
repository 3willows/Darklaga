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
    touch: false,
    click: false,
    down: false
}

const canvas = document.getElementById("gl")!;

function setMousePos(r: DOMRect, clientX: number, clientY: number) {
    
    let { left, top, width, height } = r;

    if (width * 4 != height * 3) {
        // If in fullscreen mode, the canvas element rectangle is stretched to 
        // cover the entire screen, but the rendered contents have the normal 3x4
        // ratio and are displayed in the center of the screen.
        if (width * 4 > height * 3) {
            // Too tall ! 
            width = height * 3 / 4;
            left = (r.width - width) / 2;
        } else {
            // Too wide ! 
            height = width * 4 / 3;
            top = (r.height - height) / 2;
        }
    }

    mouse.x = Math.max(0, Math.min(r.width, clientX - left)) * (240 / width);
    mouse.y = Math.max(0, Math.min(r.height, clientY - top)) * (320 / height);
}

function onMouse(e: MouseEvent) {
    const r = canvas.getBoundingClientRect();
    setMousePos(r, e.clientX, e.clientY);
    e.preventDefault();
}

function onTouch(e: TouchEvent) {
    const r = canvas.getBoundingClientRect();
    mouse.click = !mouse.down;
    mouse.down = mouse.touch = true;
    setMousePos(r, e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
}

document.addEventListener("keydown", onKey(true))
document.addEventListener("keyup", onKey(false))
document.addEventListener("mousemove", onMouse)
document.addEventListener("mousedown", e => { mouse.click = !mouse.down; mouse.down = true ; e.preventDefault() });
document.addEventListener("mouseup", e => { mouse.down = mouse.click = false ; e.preventDefault() });
document.addEventListener("touchmove", onTouch);
document.addEventListener("touchstart", onTouch);
document.addEventListener("touchend", e => { mouse.down = mouse.click = false ; e.preventDefault() });