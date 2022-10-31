import { Type } from "./Type";
import { Operator } from "./index"

export class Expression{
    constructor(lineNumber: number, t?: Type){
        this.lineNumber = lineNumber;
        this.t = t;
    }

    lineNumber: number;
    t?: Type;
    getType: () => Type|String = () => {return this.t? this.t:""};
    eval: () => String = () => {return ""};
}

export class UnaryExpr extends Expression{
    constructor(lineNumber: number, t: Type, op: Operator){
        super(lineNumber,t);
        this.op = op;
    }
    op: Operator;
    child?: Expression;

    setChild  = (e: Expression) => {this.child  = e;}

    getType = () => {
        if (this.child?.getType() == this.t){
            return this.t as Type;
        }
        return "err";
    }
    eval = () => {
        return `${this.op} ${this.child?.eval()}` ;
    }
}

export class BinaryExpr extends Expression{
    constructor(lineNumber: number, t: Type, op: Operator){
        super(lineNumber,t);
        this.op = op;
    }
    op: Operator;
    left?: Expression;
    right?: Expression;

    setLeft  = (e: Expression) => {this.left  = e;}
    setRight = (e: Expression) => {this.right = e;}

    getType = () => {
        if (this.left?.getType() == this.t && this.right?.getType() == this.t){
            return this.t as Type;
        }
        return "err";
    }
    eval = () => {
        return `${this.left?.eval()} ${this.op} ${this.right?.eval()}` ;
    }
}

export class ConstExpr extends Expression{
    constructor(lineNumber: number, t: Type, val: any){
        super(lineNumber,t);
        this.val = val;
    }
    val: any;
    eval = () => {
        return `${this.val}` ;
    }
}

