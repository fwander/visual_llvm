
export class Type {
    val: string;
    args?: Type[];
    constructor(t: string, args?: Array<Type>){
        this.val = t;
        this.args = args? args: undefined;
    }
    toString: () => string =  () => {
        return this.val;
    }
    eval: () => string = () =>{
        return this.val;
    }
}

// enum TypeType {
//     NUMERICAL_OPERATORS = 0,
//     BOOLEAN_OPERATORS,
//     CONSTANT,
//     USERTYPE,
//     FUNCTION,
//     MEMORY,
// }


export const INT = new Type("int")
export const BOOL = new Type("bool")
export const STRING = new Type("string")
export const POINTER = new Type("pointer")
export const VOID = new Type("void")
export {}
