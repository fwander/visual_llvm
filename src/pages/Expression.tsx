import { Type, VOID } from "./Type";
import { Operator } from "./index"
import { Stringifier } from "postcss";

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

export class AssignExpr extends Expression{
    constructor(lineNumber: number, ident: string, assignTo: Expression){
        super(lineNumber);
        this.ident = ident;
        this.assignTo = assignTo;
    }
    ident: string;
    assignTo: Expression;
    setid  = (e: string) => {this.ident  = e;}
    setExpr = (e: Expression) => {this.assignTo = e;}
    // %ident_val eval(assignTo)
    // %ident_ptr = alloca type(assignTo)
    // store type(assignTo) %ident_val, ptr(type(assign)) %ident_ptr
    eval = () => {
        return `` ;
    }
    getType = () => {return this.assignTo.getType()}
}

export class ParamExpr extends Expression{
    constructor(lineNumber: number, ident: string, type: Type){
        super(lineNumber);
        this.ident = ident;
        this.type = type;
    }
    ident: string;
    type: Type;
    setid  = (e: string) => {this.ident  = e;}
    setType = (e: Type) => {this.type = e;}
    eval = () => {
        return `` ;
    }
    getType = () => {return this.type}
}

export class ReturnExpr extends Expression {
    child?: Expression
    setChild = (e: Expression) => {this.child = e;}

    eval = () => {
        return `` ;
    }
    getType = () => {return this.child? this.child.getType():"Err"}

}

export class DeRefExpr extends Expression {
    constructor(lineNumber: number, assignedAt?: Expression){
        super(lineNumber);
        this.assignedAt = assignedAt;
    }
    assignedAt?: Expression;

    getType = () => {return this.assignedAt? this.assignedAt.getType():"Err"}
}

export class FunctionExpr extends Expression {
    constructor(name: string, retType: Type){
        super(0);
        this.name = name;
        this.retType = retType;
    }
    name: string;
    retType: Type;
    codeBlock?: BlockExpr;
    params: ParamExpr[] = [];
    setChild = (e: Expression) => {this.codeBlock = e as BlockExpr;}
    eval = () => {
        return `
        const ${this.name}_ret_type = ${this.retType.eval()};
        const ${this.name}_param_types = [${this.params.map((p)=>{p.type.eval().concat(',')})}];
        const ${this.name}_type = llvm.FunctionType.get(${this.name}_ret_type,${this.name}_param_types,false);
        const ${this.name} = llvm.Function.Create(${this.name}_type, linkage, ${this.name}, module);
        ${this.codeBlock?.header()}
        ${this.codeBlock?.insert()}
        ${this.codeBlock?.eval()}
        ` ;
    }
    getType = () => {return VOID}
}

export class BlockExpr extends Expression {
    constructor(name: string, func: FunctionExpr){
        super(0);
        this.name = name;
        this.func = func;
    }
    slices = 0;
    name: string;
    lines: Expression[] = [];
    func: FunctionExpr;
    header = () => {
        return `const ${this.name} = llvm.BasicBlock.Create(context, '${this.name}', ${this.func.name});`

    }
    insert = () => {
        return `builder.SetInsertPoint(${this.name});`
    }
    eval = () => {
        return `${this.lines.map((e:Expression)=>{e.eval().concat('\n');})}` ;
    }
    getType = () => {return VOID}
}

export class WhileExpr extends Expression {
    constructor(lineNumber: number, insideOf: BlockExpr){
        super(lineNumber);
        this.insideOf = insideOf;
    }
    insideOf: BlockExpr;
    block?: BlockExpr;
    setIf = (e: Expression) => {this.block = e as BlockExpr;}
    cond?: Expression;
    setCond = (e: Expression) => {this.cond = e;}
    eval = () => {
        this.insideOf.slices++;
        const exit: BlockExpr = new BlockExpr(this.insideOf.name.concat('_',`${this.insideOf.slices}`),this.insideOf.func);
        return `
        ${this.block?.header()}
        ${exit.header()}
        ${this.block?.insert()}
        builder.CreateCondBr(${this.cond?.eval()},${this.block?.name},${exit.name})
        ${this.block?.eval()}
        builder.CreateBr(${this.block?.name});
        ${exit.insert()}
        ${exit.eval()}
        `;
    }
    getType = () => {return VOID}
}

export class IfExpr extends Expression {
    constructor(lineNumber: number, insideOf: BlockExpr){
        super(lineNumber);
        this.insideOf = insideOf;
    }
    insideOf: BlockExpr;
    ifBlock?: BlockExpr;
    setIf = (e: Expression) => {this.ifBlock = e as BlockExpr;}
    cond?: Expression;
    setCond = (e: Expression) => {this.cond = e;}
    eval = () => {
        this.insideOf.slices++;
        const exit: BlockExpr = new BlockExpr(this.insideOf.name.concat('_',`${this.insideOf.slices}`),this.insideOf.func);
        return `
        ${this.ifBlock?.header()}
        ${exit.header()}
        builder.CreateCondBr(${this.cond?.eval()},${this.ifBlock?.name},${exit.name})
        ${this.ifBlock?.insert()}
        ${this.ifBlock?.eval()}
        builder.CreateBr(${exit.name});
        ${exit.insert()}
        ${exit.eval()}
        `;
    }
    getType = () => {return VOID}
}

export class IfElseExpr extends Expression {
    constructor(lineNumber: number, insideOf: BlockExpr){
        super(lineNumber);
        this.insideOf = insideOf;
    }
    insideOf: BlockExpr;
    ifBlock?: BlockExpr;
    setIf = (e: Expression) => {this.ifBlock = e as BlockExpr;}
    elseBlock?: BlockExpr;
    setElse = (e: Expression) => {this.elseBlock = e as BlockExpr;}
    cond?: Expression;
    setCond = (e: Expression) => {this.cond = e;}
    eval = () => {
        this.insideOf.slices++;
        const exit: BlockExpr = new BlockExpr(this.insideOf.name.concat('_',`${this.insideOf.slices}`),this.insideOf.func);
        return `
        ${this.ifBlock?.header()}
        ${this.elseBlock?.header()}
        ${exit.header()}
        builder.CreateCondBr(${this.cond?.eval()},${this.ifBlock?.name},${this.elseBlock?.name})
        ${this.ifBlock?.insert()}
        ${this.ifBlock?.eval()}
        builder.CreateBr(${exit.name});
        ${this.elseBlock?.insert()}
        ${this.elseBlock?.eval()}
        builder.CreateBr(${exit.name});
        ${exit.insert()}
        ${exit.eval()}
        `;
    }
    getType = () => {return VOID}
}
