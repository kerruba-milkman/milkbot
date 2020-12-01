export function chunk(array: any[], chunkSize): any[] {
    let resultArray = [];
    for (let i = 0, len = array.length; i < len; i += chunkSize)
        resultArray.push(array.slice(i, i + chunkSize));
    return resultArray;
}