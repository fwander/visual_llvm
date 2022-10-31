import type { AppProps } from "next/app";
import { type } from "os";
import React, { Component, useEffect, useState } from "react";
import internal from "stream";
import { map, number } from "zod";
import { BinaryExpr, ConstExpr, Expression, UnaryExpr } from "./Expression";
import { BOOL, INT, POINTER, STRING, Type, VOID } from "./Type"

export default function Home() {
  let context = new Context();
  let initProps = new Props(context,0);
  return <div className="h-screen w-screen flex flex-col">
    <FunctionDef {...initProps}/>
    </div>
}

var input_field = "bg-gray-50 h-2 border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500";
var button = "inline-flex items-center select-none px-1.5 py-0 text-gray-500 rounded-md hover:bg-gray-200 hover:text-gray-600";
var red_button = button + " bg-red-400 text-gray-50 hover:bg-red-500 hover:text-gray-100";

const types = [
  INT,
  BOOL,
  STRING,
  POINTER,
  VOID
]

function Dummy(){
  return <div>"hello"</div>
}

export enum Operator {
  // numerical
  PLUS  = "+",
  MINUS = "-",
  TIMES = "*",
  DIV   = "/",
  // logic
  AND   = "and",
  OR    = "or",
  NOT   = "!",
  // memory
  REF   = "&",
  DEREF = "*",
}

//get expression component from selection

class Context {
  names: string[] = []
  exprs: Expression[] = [] 
  parentContext?: Context;
  current?: Expression;

  constructor(parent?: Context){
    this.parentContext = parent;
  }

  get_index = (name: string) => {
    for(let i = 0; i < this.names.length; i++){
      if(this.names[i] === name){
        return i;
      }
    }
    return -1;
  }

  set = (name: string, t: Expression) => {
    let ind = this.get_index(name);
    if (ind != -1){
      this.exprs[ind] = t;
    }
    else{
      this.names.push(name);
      this.exprs.push(t);
    }
  }

  update_name = (old: string, updated: string, lineNumber: number, t?: Expression) => {
    let ind = this.get_index(old);
    if (ind != -1){
      this.names[ind] = updated;
      if (t)
        this.exprs[ind] = t;
    }
    else if (t){
      this.names.push(updated);
      this.exprs.push(t? t: new Expression(lineNumber));
    }
  }

  del = (name: string) => {
    let ind = this.get_index(name);
    if (ind != -1){
      this.names.splice(ind,1);
    }
  }
}

class Props {
  lineNumer: number;
  context: Context;
  content: string = "";
  typeFilter: (t: Type) => boolean = (t: Type) => true;
  lvalSetter?: (n: string)=>void;
  rvalSetter?: (n: Expression)=>void;
  typeSetter?: (n: Type)=>void;
  current?: Type;
  constructor(context: Context, lineNumber: number, lvalSetter?: (n: string)=>void, rvalSetter?: (n: Expression)=>void, current?: Type, content?: string, typeFilter?: (t: Type) => boolean, typeSetter?:(n:Type)=>void) {
    this.lineNumer = lineNumber;
    this.context = context;
    this.lvalSetter = lvalSetter;
    this.rvalSetter = rvalSetter;
    this.typeSetter = typeSetter;
    this.current = current;
    if (content){
      this.content = content;
    }
    if (typeFilter){
      this.typeFilter = typeFilter;
    }
  }
  copy = () => {
    return new Props(this.context,this.lineNumer,this.lvalSetter,this.rvalSetter,this.current,this.content,this.typeFilter);
  }
}

const CodeBlock: React.FC<Props> = (props) => {
  const [numLines, setNumLines] = useState(1);
  let context = new Context(props.context);

  // console.log(props.context);
  let numArr = [];
  for (let i = 0; i < numLines; i++){
    numArr.push(i);
  }
  return <div className="flex flex-col space-y-2 p-5">
    {numArr.map((i: number) => <SelectLine {...new Props(context,i)} />)}
    <div className="flex flex-row">
      <a className={button} onClick={() => setNumLines(numLines+1)}>add</a>
      <a className={button} onClick={() => setNumLines(Math.max(numLines-1, 0))}>remove</a>
    </div>
  </div>
}

class SelectInput {
  names: string[];
  outputs: JSX.Element[];
  d: (() => void)[] = [];
  constructor(names: string[], outputs: JSX.Element[], def?: string, del?: (() => void)[]){
    if (!def){
      def = "select input"
    }
    if (del){
      this.d = del;
    }
    this.names = [def].concat(names);
    this.outputs = outputs;
  }
}

const Select: React.FC<SelectInput> = (props) => {
  const [childIndex, setChild] = useState(-1);
  function handleChange(name: string) {
    setChild(props.names.findIndex(x => x == name) - 1);
  }
  function deleteCurrent(){
      console.log("DELETE" + childIndex);
    if (childIndex != -1 && props.d[childIndex] !== undefined){
      (props.d[childIndex] as () => void)();
    }
    setChild(-1);
  }
  let i = 0;
  if (childIndex > -1) {
    return <div className="flex flex-row space-x-1 items-center justify-left">{props.outputs[childIndex]} <a onClick={()=>{deleteCurrent()}} className={red_button}>X</a></div>
  }
  else{
  return <select className="w-40 h-5" value={-1} onChange={(e) => handleChange(e.target.value)}>
      {props.names.map((name: string) => 
        <option key={i++} value={name}>{name}</option>
      )}
    </select>

  }
}

const SelectType: React.FC<Props> = (props) => {
  let si = new SelectInput( types.map((t) => t.toString()) , types.map((t) => <TTypeCom {...new Props(props.context,props.lineNumer,props.lvalSetter,props.rvalSetter,t,props.content,props.typeFilter,props.typeSetter)}/>),"Select Expression");
  return <Select {...si}/>
}

//       //
// Exprs //
//       //

const SelectExpressionType: React.FC<Props> = (context) => {
  let si = new SelectInput(["Constant", "Logic", "Arithmetic", "Variable"], [<Const {...context}/>, <SelectLogic {...context}/>, <SelectArith {...context}/>, <SelectVars {...context}/>],"Select Expression");
  return <Select {...si}/>
}

const SelectLogic: React.FC<Props> = (context) => {
  let passing = context.copy();
  passing.current = (BOOL);
  let si = new SelectInput([
    Operator.AND,
    Operator.OR,
    Operator.NOT,
  ],[
    <BinaryOp op={Operator.AND} props={passing}/>,
    <BinaryOp op={Operator.OR}  props={passing}/>,
    <UnaryOp  op={Operator.NOT} props={passing}/>,
  ], "Select Operation");

  return <Select {...si}/>
}

const SelectArith: React.FC<Props> = (context) => {
  let passing = context.copy();
  passing.current = (INT);
  let ops = [
    Operator.PLUS,
    Operator.MINUS,
    Operator.TIMES,
    Operator.DIV,
  ];
  let si = new SelectInput(ops,
    ops.map((op) => <BinaryOp op={op} props={passing}/>)
  , "Select Operation");
  return <Select {...si}/>
}


const SelectVars: React.FC<Props> = (props) => {
  let var_names: string[] = [];
  let var_exprs = [];
  let components = [];
  let currentContext: Context | undefined = props.context;
  let line = props.lineNumer;
  while(currentContext !== undefined){
    let i = 0;
    console.log(currentContext);
    for (var name of currentContext.names){
      if (line >= 0 && i >= line){
        break;
      }
      if (props.current && currentContext.exprs[i]?.getType() as Type != props.current){
        i++;
        continue;
      }
      if (currentContext.exprs[i] !== undefined && props.typeFilter(currentContext.exprs[i]?.getType() as Type)){
        var_names.push(name);
        let passing = props.copy();
        passing.current = currentContext.exprs[i]?.getType() as Type;
        passing.content = name;
        components.push(<VarCom {...passing}/>);
        var_exprs.push(currentContext.exprs[i]);
      }
      i++;
    }
    line = -1;
    currentContext = currentContext.parentContext;
  }
  let si = new SelectInput(var_names, components, "Select variable");
  return <Select {...si}/>
}


//       //
// Lines //
//       //

const remove = (context: Context, linenumber: number) =>{
  for (var expr of context.exprs){
    if(expr.lineNumber == linenumber){
      context.del(context.names[expr.lineNumber] as string);
    }
  }
}

const SelectLine: React.FC<Props> = (props) => {
  let si = new SelectInput([
    "assign",
    "if",
    "if-else",
    "while",
  ],[
    <Assign {...props}/>,
    <If{...props}/>,
    <IfElse {...props}/>,
    <While {...props}/>,
  ], "Select New Line",
  [() => {remove(props.context,props.lineNumer)}]
  );
  return <Select {...si}/>
}

const SelectLValueType: React.FC<Props> = (context) => {
  let si = new SelectInput([
    "new variable",
    "existing variable",
  ],[
    <NewVar {...context}/>,
    <SelectVars {...context}/>

  ], "Select L-Value",
  [() => {remove(context.context,context.lineNumer)}]
  );
  return <Select {...si}/>
}

//        //
// Render //
//        //

function BinaryOp(props: any){
  if (!props.props.current){
    return <div>Error no Type</div>
  }
  let expr = new BinaryExpr(props.lineNumer,props.current,props.op);
  let lprops = props.props.copy();
  let rprops = props.props.copy();
  lprops.rvalsetter = expr.setLeft;
  rprops.rvalsetter = expr.setRight;
  return <div className="flex flex-row space-x-2">
    <div>(</div>
    <SelectExpressionType {...lprops}/>
    <div>{props.op}</div>
    <SelectExpressionType {...rprops}/>
    <div>)</div>
    </div>
}

function UnaryOp(props: any){
  if (!props.props.current){
    return <div>Error no Type</div>
  }
  let expr = new UnaryExpr(props.lineNumer,props.current,props.op);
  let cprops = props.props.copy();
  cprops.rvalsetter = expr.setChild;
  return <div className="flex flex-row space-x-2">
    <div>{props.op}</div>
    <div>(</div>
    <SelectExpressionType {...cprops}/>
    <div>)</div>
    </div>
}

const Assign: React.FC<Props> = (props) => {
  const [name, setName] = useState('');
  const [T, setType] = useState(new Expression(props.lineNumer));
  let newProps = new Props(props.context,props.lineNumer,updateName,updateType,undefined,undefined,(t: Type) => { if (t.args){ return false; } return true; });
  if (name !== '')
    props.context.set(name,T);
  function updateName(newName: string){
    props.context.update_name(name,newName,props.lineNumer,T);
    // console.log(props.context);
    setName(newName);
  }
  function updateType(newType: Expression){
    setType(newType);
    props.context.set(name,T)
  }
  
  return <div className="flex flex-row space-x-2">
    <SelectLValueType     {...newProps}/>
    <div>
      := 
    </div>
    <SelectExpressionType {...newProps}/>
    </div>
}

const Param: React.FC<Props> = (props) => {
  const [name, setName] = useState('');
  const [T, setType] = useState(new Expression(props.lineNumer,new Type("")));
  if (name !== '')
    props.context.set(name,T);
  function updateName(newName: string){
    props.context.update_name(name,newName,props.lineNumer,T)
    console.log(props.context);
    setName(newName);
  }
  function updateType(newType: Type){
    if (props.typeSetter){
      props.typeSetter(newType);
    }
    T.t = newType;
    setType(T);
    props.context.set(name,T);
  }
  let newProps = new Props(props.context,props.lineNumer,updateName);
  newProps.typeSetter = updateType;
  return <div className="flex flex-row space-x-2">
    <NewVar {...newProps}/>
    <div>
      := 
    </div>
    <SelectType {...newProps}/>
    </div>
}

const NewVar: React.FC<Props> = (props) => {
  if (!props.lvalSetter){
    return <p>ERROR no l value setter for new value</p>
  }
  let setter = props.lvalSetter;
  return <input
        className={input_field + " w-32"}
        onChange={(e) => {setter(e.target.value)}}
      />
}

const Const: React.FC<Props> = (props) => {
  const [ok,setOk] = useState(true);
  if (!props.rvalSetter){
    return <p>ERROR no r value setter for new value</p>
  }
  let setter = props.rvalSetter;
  function handleChange(val: string){
    var num = +val;
    if (val.charAt(0) == '"' && val.charAt(val.length-1) == '"'){
      setter(new ConstExpr(props.lineNumer,STRING,val.slice(1,-1)))
      setOk(true)
    }
    else if (num || num == 0){
      setter(new ConstExpr(props.lineNumer,INT,num))
      setOk(true);
    }
    else{
      setOk(false);
    }
  }
  if (ok){
  return <input
        className={input_field + " w-32"}
        onChange={(e) => {handleChange(e.target.value)}}
      />
  }
  else {
  return <input
        className={input_field + " w-32 focus:bg-red-500 border-red-500 "}
        onChange={(e) => {handleChange(e.target.value)}}
      />
  }
}


const VarCom: React.FC<Props> = (props) => {
  return <div>{props.content}</div>
}

const TTypeCom: React.FC<Props> = (props) => {
  if (props.typeSetter && props.current){
    props.typeSetter(props.current);
    console.log("TYPESETTER!!!");
    return <div>{props.current.toString()}</div>
  }
  if(props.current){
    return <div>{props.current.toString()}</div>
  }
  return <div>ERROR no type?</div>
}

const IfElse: React.FC<Props> = (props) => {
  let ifcontext = new Context(props.context);
  let elsecontext = new Context(props.context);
  let ifprops = new Props(ifcontext,0);
  let elseprops = new Props(elsecontext,0);
  return <div className="flex flex-col bg-gray-400 bg-opacity-50 rounded-md p-2">
    <div className="flex flex-row space-x-4">
      <div>
        if
      </div>
      <SelectExpressionType {...props}/>
    </div>
    <div className="flex flex-row divide-x-2">
      <div>
        then
        <CodeBlock {...ifprops}/>
      </div>
      <div className="p-2">
        else
        <CodeBlock {...elseprops}/>
      </div>
    </div>

    </div>
}

const If: React.FC<Props> = (props) => {
  let ifcontext = new Context(props.context);
  let ifprops = new Props(ifcontext,0);
  return <div className="flex flex-col bg-gray-400 bg-opacity-50 rounded-md p-2">
    <div className="flex flex-row space-x-4">
      <div>
        if
      </div>
      <SelectExpressionType {...props}/>
    </div>
    <div className="flex flex-row divide-x-2">
      <div>
        then
        <CodeBlock {...ifprops}/>
      </div>
    </div>
    </div>
}

const While: React.FC<Props> = (props) => {
  let ifcontext = new Context(props.context);
  let ifprops = new Props(ifcontext,0);
  return <div className="flex flex-col bg-gray-400 bg-opacity-50 rounded-md p-2">
    <div className="flex flex-row space-x-4">
      <div>
        while
      </div>
      <SelectExpressionType {...props}/>
    </div>
    <div className="flex flex-row divide-x-2">
      <div>
        do
        <CodeBlock {...ifprops}/>
      </div>
    </div>

    </div>
}

const FunctionDef: React.FC<Props> = (props) => {
  const [name, setName] = useState('function_name');
  const [returnType, setReturnType] = useState(new Expression(0));
  const [numArgs, setNumArgs] = useState(0);
  let context = new Context(props.context);
  let initProps = new Props(context,0,updateName,updateType);

  function updateName(newName: string){
    props.context.update_name(name,newName,props.lineNumer,returnType);
    setName(newName);
  }

  function updateType(newType: Expression){
    let newrt = returnType;
    newrt.getType = newType.getType;
    setReturnType(newrt);
    props.context.set(name,returnType);
  }

  function updateNthArgType(n: number){
    return (newType: Expression) => {
      console.log(n)
      let newReturnType = returnType;
      let t: Type = newReturnType.getType() as Type
      if (t.args){
        t.args[n] = newType.getType() as Type;
      }
      setReturnType(newReturnType);
      props.context.set(name,returnType);
      context.set(name,newType);
    }
  }

  function addArg(){
    let newrt = returnType;
    let t = newrt.getType() as Type;
    if (t.args){
      t.args.push(new Type(""));
    }
    setNumArgs(numArgs+1);
    setReturnType(newrt);
  }

  function removeArg(){
    if(numArgs == 0){return;}
    let newrt = returnType;
    let t = newrt.getType() as Type;
    if (t.args){
      t.args.pop();
    }
    setNumArgs(numArgs-1);
    setReturnType(newrt);
  }

  let numArr = [];
  for (let i = 0; i < numArgs; i++){
    numArr.push(i);
  }
  
  console.log("FUNC");
  console.log(context.names);

  return <div className="border-2 flex flex-col space-y-1 font-mono bg-gray-50">
    <div className="flex flex-row space-x-4 items-center">
      <div>
      function
      </div>
      <NewVar {...initProps}/>
      <div>(</div>
      {numArr.map((i) => <Param key={i} {...new Props(context,0,undefined,updateNthArgType(i))} />)}
      <div className="flex flex-col">
        <a className={button} onClick={() => addArg()}>+</a>
        <a className={button} onClick={() => removeArg()}>-</a>
      </div>
      <div>) =&gt; </div>
      <SelectType {...initProps}/>
    </div>
    <CodeBlock {...new Props(context, 0)}/>
  </div>
}