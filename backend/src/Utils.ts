export function getRandomInt(max: number) : number {
    return Math.floor(Math.random() * Math.floor(max))
}

export function arrayToRbgString(values : [number, number, number] | [number, number, number, number] ) : string {
    if(values.length === 4){
        return `rgba(${values[0]},${values[1]},${values[2]},${values[3]})`;
    }
    return `rgb(${values[0]},${values[1]},${values[2]})`;
}
