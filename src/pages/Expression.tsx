import { BOOL, INT, Type, VOID } from "./Type";
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
        switch(this.op){
            case Operator.AND:
                return `builder.CreateNot(
    ${this.child?.eval()}
)`
        }
        return `` ;
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
        switch(this.op){
            case Operator.AND:
                return `builder.CreateAnd(
    ${this.left?.eval()},${this.right?.eval()})
`;
            case Operator.OR:
                return `builder.CreateOr(
${this.left?.eval()},${this.right?.eval()})
`;
            case Operator.PLUS:
                return `builder.CreateAdd(
${this.left?.eval()},${this.right?.eval()})
`;
            case Operator.MINUS:
                return `builder.CreateSub(
${this.left?.eval()},${this.right?.eval()})
`;
            case Operator.TIMES:
                return `builder.CreateMul(
${this.left?.eval()},${this.right?.eval()})
`;
            case Operator.DIV:
                return `builder.CreateSDiv(
${this.left?.eval()},${this.right?.eval()})
`;
        }
        return "";
    }
}

export class ConstExpr extends Expression{
    constructor(lineNumber: number, t: Type, val: any){
        super(lineNumber,t);
        this.val = val;
    }
    val: any;
    eval = () => {
        switch(this.t){
            case BOOL:
                return `builder.getInt1( ${this.val ? 1 : 0})`;
            case INT:
                return `builder.getInt32(${this.val})`;
        }
        return `${this.val}` ;
    }
}

export class AssignExpr extends Expression{
    constructor(lineNumber: number, ident: string, assignTo: Expression){
        super(lineNumber);
        this.ident = ident;
        this.assignTo = assignTo;
    }
    upToDate = true;
    ident: string;
    assignTo: Expression;
    setid  = (e: string) => {this.ident  = e;}
    setExpr = (e: Expression) => {this.assignTo = e;}
    eval = () => {
        return `let ${this.ident}_val = ${this.assignTo.eval()};
let ${this.ident}_ptr = builder.CreateAlloca(${(this.assignTo.getType() as Type).eval()},null,'${this.ident}');
builder.CreateStore(${this.ident}_val,${this.ident}_ptr); ` ;
    }
    getType = () => {return this.assignTo.getType()}
}

export class SetExpr extends Expression{
    constructor(lineNumber: number, assignExpr: AssignExpr | ParamExpr, assignTo: Expression){
        super(lineNumber);
        this.assignExpr = assignExpr;
        this.assignTo = assignTo;
    }
    refs = 0;
    upToDate = true;
    assignExpr: AssignExpr | ParamExpr;
    assignTo: Expression;
    setExpr = (e: Expression) => {this.assignTo = e;}
    eval = () => {
        this.assignExpr.upToDate = true;
        return `${this.assignExpr.ident}_val = ${this.assignTo.eval()};
builder.CreateStore(${this.assignExpr.ident}_val,${this.assignExpr.ident}_ptr);` ;
    }
    getType = () => {return this.assignTo.getType()}
}

export class ParamExpr extends Expression{
    constructor(lineNumber: number, ident: string, type: Type, index: number, func: FunctionExpr){
        super(lineNumber, type);
        this.ident = ident;
        this.type = type;
        this.index = index;
        this.func = func;
    }
    refs = 0;
    upToDate = true;
    ident: string;
    type: Type;
    index: number;
    func: FunctionExpr;
    setid  = (e: string) => {this.ident  = e;}
    setType = (e: Type) => {this.type = e;}
    eval = () => {
        return `` ;
    }
    getType = () => {return this.t as Type}
}

export class ReturnExpr extends Expression {
    child?: Expression
    setChild = (e: Expression) => {this.child = e;}
    eval = () => {
        return `builder.CreateRet(${this.child?.eval()});` ;
    }
    getType = () => {return this.child? this.child.getType():"Err"}
}

export class DeRefExpr extends Expression {
    constructor(lineNumber: number, assignedAt?: AssignExpr | ParamExpr){
        super(lineNumber);
        this.assignedAt = assignedAt;
    }
    assignedAt?: AssignExpr | ParamExpr;
    eval = () => {
        if (this.assignedAt?.upToDate) {
            if (this.assignedAt instanceof AssignExpr)
                return `${this.assignedAt.ident}_val`;
            else
                return `${this.assignedAt.func.name}.getArg(${this.assignedAt.index})`
        }
        if (this.assignedAt){
            this.assignedAt.upToDate = true;
        }
        return `${this.assignedAt?.ident}_val = builder.CreateLoad(${this.assignedAt?.getType()}, ${this.assignedAt?.ident}_ptr);` ;
    }

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
        return `let ${this.name}_ret_type = ${this.retType.eval()};
let ${this.name}_param_types = [${this.params.map((p)=>{return p.t?.val.concat(',')})}];
let ${this.name}_type = llvm.FunctionType.get(${this.name}_ret_type,${this.name}_param_types,false);
let ${this.name} = llvm.Function.Create(${this.name}_type, linkage, ${this.name}, module);
${this.codeBlock?.header()}
${this.codeBlock?.insert()}
${this.codeBlock?.eval()}` ;
    }
    getType = () => {return this.retType}
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
        return `let ${this.name} = llvm.BasicBlock.Create(context, '${this.name}', ${this.func.name});`

    }
    insert = () => {
        return `builder.SetInsertPoint(${this.name});`
    }
    eval = () => {
        return this.lines.map((e:Expression)=>{return e.eval();}).join('');
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
        return `${this.block?.header()}
${exit.header()}
${this.block?.insert()}
builder.CreateCondBr(${this.cond?.eval()},${this.block?.name},${exit.name})
${this.block?.eval()}
builder.CreateBr(${this.block?.name});
${exit.insert()}
${exit.eval()}`;
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
        return `${this.ifBlock?.header()}
${exit.header()}
builder.CreateCondBr(${this.cond?.eval()},${this.ifBlock?.name},${exit.name})
${this.ifBlock?.insert()}
${this.ifBlock?.eval()}
builder.CreateBr(${exit.name});
${exit.insert()}
${exit.eval()} `;
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
        return `${this.ifBlock?.header()}
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
${exit.eval()}`;
    }
    getType = () => {return VOID}
}
export class GlobalExpr extends Expression {
    functions: FunctionExpr[] = [];

    eval = () => {
        return `let context = new llvm.LLVMContext();
let module = new llvm.Module("out",context);
let builder = new llvm.IRBuilder(context);
${this.functions.map((f)=>f.eval()).join()}
console.log(module.print()); `
    }
    getType = () => {return VOID}
}



export class FunctionCallExpr extends Expression {

}