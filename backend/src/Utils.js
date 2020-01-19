export function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max))
}

export function arrayToRbgString(values) {
    if(values.length === 4){
        return `rgba(${values[0]},${values[1]},${values[2]},${values[3]})`;
    }
    return `rgb(${values[0]},${values[1]},${values[2]})`;
}
