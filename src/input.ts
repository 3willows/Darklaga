export const key = {
    up: false,
    left: false,
    down: false,
    right: false,
    action: false,
    action2: false
}

function handler(setTo: boolean) {
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

document.addEventListener("keydown", handler(true))
document.addEventListener("keyup", handler(false))
