import type { AppProps } from "next/app";
import { type } from "os";
import React, { Component, useEffect, useState } from "react";
import internal from "stream";
import { map, number, ZodFunctionDef } from "zod";
import { AssignExpr, BinaryExpr, BlockExpr, ConstExpr, DeRefExpr, Expression, FunctionCallExpr, FunctionExpr, GlobalExpr, IfElseExpr, IfExpr, ParamExpr, ReturnExpr, SetExpr, UnaryExpr, WhileExpr } from "./Expression";
import { BOOL, INT, POINTER, STRING, Type, VOID } from "./Type"
import { remove, useQueryState } from "./util";
import { Prism } from '@mantine/prism';
import { Router, useSearchParams } from "react-router-dom";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";

var input_field = "bg-gray-50 h-2 border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 my-auto";
var button = "inline-flex items-center select-none px-1.5 py-0 bg-gray-50 mx-1 text-gray-500 rounded-md hover:bg-gray-200 hover:text-gray-600";
var red_button = button + " bg-red-400 text-gray-50 hover:bg-red-500 hover:text-gray-100";
var component_row = "flex flex-row space-x-1 bg-gray-900 bg-opacity-10 rounded-md p-2 align-middle justify-center my-auto";
var component_col = "flex flex-col space-y-1 bg-gray-900 bg-opacity-10 rounded-md p-1";
var keyword = "font-bold bg-opacity-100 rounded-md px-1 py-0"
var symbol = "m-auto"


export default function Home() {
  let context = new Context(new FunctionExpr("global",new Type("")));
  let expr = new GlobalExpr(0);
  const [numLines, setNumLines] = useQueryState('numfns',1,(p: string)=>{return parseInt(p)});
  const [output, setOutput] = useState(expr.eval());

  const router = useRouter();
  console.log(Object.keys(router.query).length);

  // console.log(JSON.stringify({lines:4}));

  let numArr = [];
  for (let i = 0; i < numLines; i++){
    numArr.push(i);
    expr.functions.push(new FunctionExpr("",new Type("")));
  }
  function nthProp(n: number){
    let ret = new Props(context,n,undefined,(e)=>{expr.functions[n] = e as FunctionExpr});
    ret.id = JSON.stringify(n);
    return ret;
  }
  return <div className="h-screen w-screen flex flex-row">
  <div className="h-screen bg-gray-50 flex flex-col">
    {numArr.map((i: number) => <FunctionDef {...nthProp(i)} />)}
    <div className="flex flex-row">
      <a className={button} onClick={() => setNumLines(numLines+1)}>add</a>
      <a className={button} onClick={() => setNumLines(Math.max(numLines-1, 0))}>remove</a>
    </div>
    <button className={button} onClick={(e)=>{}}>save</button>
  </div>
    <div className="bg-gray-100">
      <button className={button} onClick={(e)=>{setOutput(expr.eval())}}>compile</button>
      <Prism language="javascript">
      {output}
      </Prism>
    </div>
  </div>
}


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
  EQ    = "==",
  LT    = "<",
  GT    = ">",
  LE    = ">=",
  GE    = "<=",
  // memory
  REF   = "&",
  DEREF = "*",
}

//get expression component from selection

export class Context {
  names: string[] = []
  exprs: Expression[] = [] 
  parentContext?: Context;
  // children: Context[] = [];
  block: BlockExpr;
  functionIn: FunctionExpr;

  constructor(functionIn: FunctionExpr, parent?: Context, block?: BlockExpr){
    this.parentContext = parent;
    // this.parentContext?.children.push(this);
    this.block = block? block : (parent? parent.block : new BlockExpr("",new FunctionExpr("",new Type(""))));
    this.functionIn = functionIn;
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

  get: (name: string) => Expression | string = (name: string) => {
    let ind = this.get_index(name);
    if (ind != -1){
      return this.exprs[ind] as Expression;
    }
    if (this.parentContext){
      return this.parentContext.get(name);
    }
    return `variable ${name} could not be found`;
  }
}

class Props {
  lineNumer: number;
  context: Context;
  content: string = "";
  typeFilter: (t: Expression) => boolean = (t: Expression) => true;
  lvalSetter?: (n: string)=>void;
  rvalSetter?: (n: Expression)=>void;
  typeSetter?: (n: Type)=>void;
  current?: Type;
  currentExpr?: Expression;
  del?: ()=>void;
  color: String = "";
  id: string = "0";

  constructor(context: Context, lineNumber: number, lvalSetter?: (n: string)=>void, rvalSetter?: (n: Expression)=>void, current?: Type, content?: string, typeFilter?: (t: Expression) => boolean, typeSetter?:(n:Type)=>void, del?: ()=>void) {
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
    this.del = del;
  }
  copy = () => {
    let ret = new Props(this.context,this.lineNumer,this.lvalSetter,this.rvalSetter,this.current,this.content,this.typeFilter,this.typeSetter,this.del);
    ret.currentExpr = this.currentExpr;
    ret.color = this.color;
    ret.id = this.id;
    return ret;
  }
}

function ExprComponent(props: any){
  const [selected, setSelected] = useState(false);
  let highlighted = "bg-yellow-400 bg-opacity-70";
  function handleClick(e: React.MouseEvent<HTMLElement>){
    e.stopPropagation();
    if (e.ctrlKey)
      setSelected(true)
  }
  function addDocumentHandler(e: any){
    function documentClick(e_inner: MouseEvent){
      if(!e_inner.shiftKey){
        document.body.removeEventListener('mousedown', documentClick,true)
        setSelected(false);
      }
    }
    document.body.addEventListener('mousedown',documentClick,true);
  }
  if (props.props.rvalSetter){
    props.props.rvalSetter(props.rval);
  }
  return <div onMouseDown={handleClick} onMouseUp={addDocumentHandler} className={(props.row? component_row : component_col) + " " + (props.color? props.color : "") + " " + (selected? highlighted : "")}>
    {props.children}
  </div>
}

function KeyWord(props: any){
  let color = "bg-yellow-500"
  if (props.color){
    color = props.color
  }
  return <div className={keyword + " " +color}>
    {props.children}
  </div>
}

const CodeBlock: React.FC<Props> = (props) => {
  const [numLines, setNumLines] = useQueryState('numlines'+props.id,1,(p: string)=>{return parseInt(p)});
  const [expr,setExpr] = useState(new BlockExpr(props.content,props.context.functionIn));
  const [hasret, setHasret] = useState(false);
  let context = new Context(props.context.functionIn, props.context);
  context.block = expr;

  function setLine(n: number, e: Expression){
    expr.lines[n] = e;
    setExpr(expr);
    checkRet();
  }

  function checkRet(){
    for (let e of expr.lines){
      if (e instanceof ReturnExpr){
        setHasret(true);
        return;
      }
    }
    setHasret(false);
  }

  function nthProp(n: number){
    let ret = new Props(context,n,undefined,(e)=>{setLine(n,e)},undefined,props.content.concat(n.toString()));
    ret.id = props.id + "." +JSON.stringify(n);
    return ret;
  }


  let numArr = [];
  for (let i = 0; i < numLines; i++){
    numArr.push(i);
    expr.lines.push(new Expression(0));
  }
  return <ExprComponent props={props} rval={expr} row={false} color={props.color}> 
    {numArr.map((i: number) => <SelectLine {...nthProp(i)} />)}
    {
      hasret?
      null
      :
      <div className="flex flex-row">
        <a className={button} onClick={() => setNumLines(numLines+1)}>add</a>
        <a className={button} onClick={() => setNumLines(Math.max(numLines-1, 0))}>remove</a>
      </div>
   } 
  </ExprComponent>
}

class SelectInput {
  names: string[];
  outputs: JSX.Element[];
  d: (() => void)[] = [];
  goBack?: () => void;
  done?: () => void;
  reset?: boolean;
  id: string = "";
  constructor(names: string[], outputs: JSX.Element[], def?: string, del?: (() => void)[], goBack?: () => void,done?: ()=>void, reset?: boolean){
    if (!def){
      def = "select input"
    }
    if (del){
      this.d = del;
    }
    this.names = [def].concat(names);
    this.outputs = outputs;
    this.goBack = goBack;
    this.done = done;
    this.reset = reset;
  }
}

const Select: React.FC<SelectInput> = (props) => {
  const [childIndex, setChild] = useQueryState(props.names[0]+props.id,-1,(p: string)=>{return parseInt(p)});
  console.log(props.id, childIndex);
  function handleChange(name: string) {
    if (name === ".." && props.goBack){
      props.goBack();
      return;
    }
    setChild(props.names.findIndex(x => x == name) - 1);
  }
  function deleteCurrent(){
    if (childIndex != -1 && props.d[childIndex] !== undefined){
      (props.d[childIndex] as () => void)();
    }
    setChild(-1);
  }
  if (props.reset && childIndex != -1){
    deleteCurrent();
    if (props.done)
      props.done();
  }
  let i = 0;
  if (childIndex > -1) {
    return <div className="flex flex-row space-x-1 items-center justify-left">{props.outputs[childIndex]} {props.outputs[childIndex]?.props.del? null : <a onClick={()=>{deleteCurrent()}} className={red_button}>X</a>}</div>
  }
  else{
  return <select className="h-6 bg-gray-50 rounded-sm text-green-700 my-auto" value={-1} onChange={(e) => handleChange(e.target.value)}>
      {props.names.map((name: string) => 
        <option key={i++} value={name}>{name}</option>
      )}
    { props.goBack? <option key={i++} value="..">..</option> : null }
    </select>

  }
}

const SelectType: React.FC<Props> = (props) => {
  let si = new SelectInput( types.map((t) => t.toString()) , types.map((t) => <TTypeCom {...new Props(props.context,props.lineNumer,props.lvalSetter,props.rvalSetter,t,props.content,props.typeFilter,props.typeSetter)}/>),"Select Type");
  si.id = props.id;
  return <Select {...si}/>
}

//       //
// Exprs //
//       //

const SelectExpressionType: React.FC<Props> = (context) => {
  const [resetting,setReset] = useState(false);
  function reset(){
    setReset(true);
  }
  function done(){
    setReset(false);
  }
  let context_reset = context.copy();
  context_reset.del = reset;
  console.log('context_reset ', context_reset.id);
  let si = new SelectInput(["Constant", "Logic", "Arithmetic", "Variable"], [<Const {...context}/>, <SelectLogic {...context_reset}/>, <SelectArith {...context_reset}/>, <SelectVars {...context_reset}/>],"Select Expression",undefined,undefined,done,resetting);
  si.id = context.id;
  let sel = <Select {...si}/>
  return sel
}

const SelectLogic: React.FC<Props> = (context) => {
  let passing = context.copy();
  passing.del = undefined;
  passing.current = BOOL;
  let passing_cmp = context.copy();
  passing_cmp.del = undefined;
  passing_cmp.current = INT;
  let passing_eq = passing_cmp.copy();
  passing_eq.typeFilter = (e: Expression)=>{return true;};
  let si = new SelectInput([
    Operator.AND,
    Operator.OR,
    Operator.EQ,
    Operator.LT,
    Operator.GT,
    Operator.LE,
    Operator.GE,
    Operator.NOT,
  ],[
    <BinaryOp op={Operator.AND} props={passing}/>,
    <BinaryOp op={Operator.OR}  props={passing}/>,
    <BinaryOp op={Operator.EQ}  props={passing_eq}/>,
    <BinaryOp op={Operator.LT}  props={passing_cmp}/>,
    <BinaryOp op={Operator.GT}  props={passing_cmp}/>,
    <BinaryOp op={Operator.LE}  props={passing_cmp}/>,
    <BinaryOp op={Operator.GE}  props={passing_cmp}/>,
    <UnaryOp  op={Operator.NOT} props={passing}/>,
  ], "Select Operation",undefined,context.del);
  si.id = context.id;
  console.log('operation: ', si.id)

  return <Select {...si}/>
}

const SelectArith: React.FC<Props> = (context) => {
  let passing = context.copy();
  passing.del = undefined;
  passing.current = INT;
  let ops = [
    Operator.PLUS,
    Operator.MINUS,
    Operator.TIMES,
    Operator.DIV,
  ];
  let si = new SelectInput(ops,
    ops.map((op) => <BinaryOp op={op} props={passing}/>)
  , "Select Operation",undefined,context.del);
  si.id = context.id;
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
    for (var name of currentContext.names){
      if (line >= 0 && i >= line) break;
      if (props.current && currentContext.exprs[i]?.getType() as Type != props.current){
        i++;
        continue;
      }
      if (currentContext.exprs[i] !== undefined && props.typeFilter(currentContext.exprs[i] as Expression)){
        var_names.push(name);
        let passing = props.copy();
        passing.current = currentContext.exprs[i]?.getType() as Type;
        passing.currentExpr = currentContext.exprs[i] as Expression;
        passing.content = name;
        passing.del = undefined;
        components.push(<VarSet {...passing}/>);
        var_exprs.push(currentContext.exprs[i]);
      }
      i++;
    }
    line = -1;
    currentContext = currentContext.parentContext;
  }
  let si = new SelectInput(var_names, components, "Select variable",undefined,props.del);
  si.id = props.id;
  return <Select {...si}/>
}


//       //
// Lines //
//       //


const SelectLine: React.FC<Props> = (props) => {
  let passing = props.copy();
  passing.del = undefined;
  let si = new SelectInput([
    "declare",
    "assign",
    "if",
    "if-else",
    "while",
    "return",
  ],[
    <Assign {...passing}/>,
    <Set {...passing}/>,
    <If{...passing}/>,
    <IfElse {...passing}/>,
    <While {...passing}/>,
    <Return {...passing}/>,
  ], "Select New Line",
  [() => {remove(props.context,props.lineNumer); if (props.rvalSetter) props.rvalSetter(new Expression(props.lineNumer));}]
  );
  si.id = props.id;
  return <Select {...si}/>
}

//        //
// Render //
//        //

function BinaryOp(props: any){
  if (!props.props.current){
    return <div>Error no Type</div>
  }
  const [expr, setExpr] = useState(new BinaryExpr(props.props.lineNumer,props.props.current,props.op));
  let lprops = props.props.copy();
  let rprops = props.props.copy();
  lprops.rvalSetter = (e: Expression)=>{expr.setLeft(e);setExpr(expr)};
  lprops.del = undefined;
  lprops.id = props.props.id + ".0";
  rprops.rvalSetter = (e: Expression)=>{expr.setRight(e);setExpr(expr)};
  rprops.del = undefined;
  rprops.id = props.props.id + ".1";
  return <ExprComponent props={props.props} rval={expr} row={true}> 
    <div className={symbol}>(</div>
    <SelectExpressionType {...lprops}/>
    <div className={symbol}>{props.op}</div>
    <SelectExpressionType {...rprops}/>
    <div className={symbol}>)</div>
    </ExprComponent>
}

function UnaryOp(props: any){
  if (!props.props.current){
    return <div>Error no Type</div>
  }
  const [expr, setExpr] = useState(new UnaryExpr(props.props.lineNumer,props.props.current,props.op));
  let cprops = props.props.copy();
  cprops.del = undefined;
  cprops.rvalSetter = (e: Expression) => {expr.setChild(e);setExpr(expr)};
  cprops.id = props.props.id + ".0";
  return <ExprComponent props={props.props} rval={expr} row={true}>
    <div className={symbol}>{props.op}</div>
    <div className={symbol}>(</div>
    <SelectExpressionType {...cprops}/>
    <div className={symbol}>)</div>
    </ExprComponent>
}
const Return: React.FC<Props> = (props) => {
  const [expr, setExpr] = useState(new ReturnExpr(props.lineNumer));
  let cprops = props.copy();
  cprops.del = undefined;
  cprops.rvalSetter = (e: Expression) => {expr.setChild(e);setExpr(expr)};
  cprops.id = props.id + ".0";
  return <ExprComponent props={props} rval={expr} row={true} color="bg-amber-500">
    <KeyWord color="bg-amber-700 text-white">return</KeyWord>
    <div className={symbol}>(</div>
    <SelectExpressionType {...cprops}/>
    <div className={symbol}>)</div>
    </ExprComponent>
}

const Assign: React.FC<Props> = (props) => {
  const [name, setName] = useQueryState('varname'+props.id,'',(s:string)=>{return s.slice(1,-1);});
  const [T, setType] = useState(new AssignExpr(props.lineNumer,'',new Expression(props.lineNumer)));
  props.context.set(name,T)
  let newProps = new Props(props.context,props.lineNumer,updateName,updateType,undefined,undefined,(t: Expression) => {return !(t instanceof FunctionExpr)});
  let exprProps = new Props(props.context,props.lineNumer,undefined,updateType,undefined,undefined);
  newProps.id = props.id + ".0";
  exprProps.id = props.id + ".1";
  if (name !== '')
    props.context.set(name,T);
  function updateName(newName: string){
    props.context.update_name(name,newName,props.lineNumer,T);
    T.setid(newName);
    setType(T);
    setName(newName);
  }
  function updateType(newType: Expression){
    T.setExpr(newType);
    setType(T);
    props.context.set(name,T)
  }
  newProps.del = undefined;
  newProps.content = name;
  exprProps.del = undefined;
  
  return <ExprComponent props={props} rval={T} row={true}>
    <NewVar     {...newProps}/>
    <div className={symbol}>
      := 
    </div>
    <SelectExpressionType {...exprProps}/>
    </ExprComponent>
}

const FunctionCall: React.FC<Props> = (props) => {
  if ((props.currentExpr) && !(props.currentExpr instanceof FunctionExpr)){
    return <div>Error not a function</div>
  }
  let fn  = props.currentExpr as FunctionExpr;
  const [expr, setExpr] = useState(new FunctionCallExpr(props.lineNumer));
  function getProps(type: Type, n: number){
    let ret = props.copy()
    ret.del = undefined;
    ret.typeFilter = (e: Expression) => {return e.getType() == type}
    ret.id = props.id + "." + JSON.stringify(n);
    return ret;
  }
  return <ExprComponent props={props} rval={expr} row={true}>
    <KeyWord>
    {fn.name}
    </KeyWord>
    <div className={symbol}> ( </div>
    {fn.params.map((p,i)=>{return <SelectExpressionType {...getProps(p.t? p.t : new Type(""),i)}/>})}
    <div className={symbol}> ) </div>
  </ExprComponent>
}

const Set: React.FC<Props> = (props) => {
  const [name, setName] = useState('');
  let assign = props.context.get(name);
  if (!(assign instanceof Expression)) {
    assign = new AssignExpr(props.lineNumer,'',new Expression(props.lineNumer));
  }
  const [T,setT] = useState(new SetExpr(props.lineNumer,assign as AssignExpr | ParamExpr,new Expression(props.lineNumer)));
  function updateName(newName: string){
    let a = props.context.get(newName);
    if (a instanceof Expression)
      T.assignExpr = a as AssignExpr | ParamExpr;
      setName(newName);
      setT(T);
  }
  function updateExpr(newExpr: Expression){
    T.setExpr(newExpr);
    setT(T);
  }
  let type = T.assignExpr.getType() as Type;
  
  let newProps = new Props(props.context,props.lineNumer,undefined,updateExpr,undefined,undefined,(t: Expression) => {return !(t instanceof FunctionExpr) && (t.getType() === type)});
  let varProps = new Props(props.context,props.lineNumer,updateName,undefined,undefined,undefined,(t: Expression) => {return !(t instanceof FunctionExpr) && !(t instanceof ParamExpr)});
  newProps.id = props.id + ".0";
  varProps.id = props.id + ".1";
  varProps.del = undefined;
  newProps.del = undefined;

  return <ExprComponent props={props} rval={T} row={true}>
    <SelectVars    {...varProps}/>
    <div className={symbol}>
      =
    </div>
    <SelectExpressionType {...newProps}/>
    </ExprComponent>
}

const Param: React.FC<Props> = (props) => {
  const [name, setName] = useQueryState('paramname'+props.id,'',(s:string)=>{return s.slice(1,-1);});
  let func = props.context.parentContext?.exprs[0];
  const [T, setType] = useState(new ParamExpr(0,name,new Type(""),props.lineNumer,func as FunctionExpr));
  if (name !== '')
    props.context.set(name,T);
  function updateName(newName: string){
    props.context.update_name(name,newName,props.lineNumer,T)
    T.ident = newName;
    if (props.rvalSetter){
      props.rvalSetter(T);
    }
    setType(T);
    setName(newName);
  }
  function updateType(newType: Type){
    T.t = newType;
    setType(T);
    if (props.rvalSetter){
      props.rvalSetter(T);
    }
    props.context.set(name,T);
  }
  let newProps = new Props(props.context,props.lineNumer,updateName);
  newProps.typeSetter = updateType;
  newProps.id = props.id + ".0";
  newProps.content=name;
  let typeProps = newProps.copy();
  typeProps.id = props.id + ".1";
  return <ExprComponent props={props} rval={T} row={true}>
    <NewVar {...newProps}/>
    <div className={symbol}>
      : 
    </div>
    <SelectType {...typeProps}/>
    </ExprComponent>
}

const NewVar: React.FC<Props> = (props) => {
  if (!props.lvalSetter){
    return <p>ERROR no l value setter for new value</p>
  }
  let setter = props.lvalSetter;
  return <input
        className={input_field + " w-32"}
        onChange={(e) => {setter(e.target.value)}}
        defaultValue={props.content}
      />
}

const Const: React.FC<Props> = (props) => {
  const [ok,setOk] = useState(true);
  const [val, setVal] = useQueryState('const'+props.id,'',(s:string)=>{console.log(s);return s.slice(1,-1).replaceAll('\\"','"');});
  if (!props.rvalSetter){
    return <p>ERROR no r value setter for new value</p>
  }
  let setter = props.rvalSetter;
  useEffect(()=>check(val));
  function handleChange(val: string){
    setVal(val);
    check(val);
  }
  function check(val: string){
    var num = +val;
    if (!setter){
      return;
    }
    if (val.charAt(0) == '"' && val.charAt(val.length-1) == '"' && props.typeFilter(new Expression(props.lineNumer,STRING))){
      setter(new ConstExpr(props.lineNumer,STRING,val.slice(1,-1)))
      setOk(true)
    }
    else if ((num || num == 0) && props.typeFilter(new Expression(props.lineNumer,INT))){
      setter(new ConstExpr(props.lineNumer,INT,num))
      setOk(true);
    }
    else if ((val == "true" || val =="false") && props.typeFilter(new Expression(props.lineNumer,BOOL))){
      setter(new ConstExpr(props.lineNumer,BOOL,val == "true"))
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
        defaultValue={val}
      />
  }
  else {
  return <input
        className={input_field + " w-32 focus:bg-red-500 border-red-500 "}
        onChange={(e) => {handleChange(e.target.value)}}
      />
  }
}


const VarSet: React.FC<Props> = (props) => {
  if (props.currentExpr && (props.currentExpr instanceof FunctionExpr)){
    return <FunctionCall {...props}/>;
  }
  if (props.lvalSetter){
    props.lvalSetter(props.content);
  }
  if (props.rvalSetter){
    props.rvalSetter(new DeRefExpr(props.lineNumer,props.context.get(props.content) as ParamExpr | AssignExpr));
  }
  return <div>{props.content}</div>;
}

const TTypeCom: React.FC<Props> = (props) => {
  if (props.typeSetter && props.current){
    props.typeSetter(props.current);
    return <KeyWord color="bg-blue-500 text-white">{props.current.toString()}</KeyWord>
  }
  if(props.current){
    return <KeyWord color="bg-blue-500 text-white">{props.current.toString()}</KeyWord>
  }
  return <div>ERROR no type?</div>
}

const IfElse: React.FC<Props> = (props) => {
  let expr = new IfElseExpr(props.lineNumer,props.context.block);
  let ifcontext = new Context(props.context.functionIn, props.context);
  let elsecontext = new Context(props.context.functionIn, props.context);
  let ifprops = new Props(ifcontext,0);
  let elseprops = new Props(elsecontext,0);
  ifprops.rvalSetter = expr.setIf;
  ifprops.content = props.content.concat("_if_block");
  ifprops.color = "bg-indigo-500";
  ifprops.id = props.id + ".if." + "0";
  elseprops.rvalSetter = expr.setElse;
  elseprops.content = props.content.concat("_else_block");
  elseprops.color = "bg-rose-500";
  elseprops.id = props.id + ".if." + "1";

  let condprops = props.copy();
  condprops.typeFilter = (e: Expression) => {return e.getType() == BOOL};
  condprops.rvalSetter = expr.setCond;
  condprops.id = props.id + ".if." + "3"
  return <ExprComponent props={props} rval={expr} row={false}>
    <div className="flex flex-row space-x-4">
      <KeyWord>
        if
      </KeyWord>
      <SelectExpressionType {...condprops}/>
    </div>
    <div className="flex flex-row divide-x-2">
      <div>
        <KeyWord>
          then
        </KeyWord>
        <CodeBlock {...ifprops}/>
      </div>
      <div>
        <KeyWord className="p-2">
          else
        </KeyWord>
        <CodeBlock {...elseprops}/>
      </div>
    </div>

    </ExprComponent>
}

const If: React.FC<Props> = (props) => {
  let expr = new IfExpr(props.lineNumer,props.context.block);
  let ifcontext = new Context(props.context.functionIn, props.context);
  let ifprops = new Props(ifcontext,0);
  ifprops.rvalSetter = expr.setIf;
  ifprops.content = props.content.concat("_if_block");
  ifprops.color = "bg-indigo-500";
  ifprops.id = props.id + "." + "0";

  let condprops = props.copy();
  condprops.typeFilter = (e: Expression) => {return e.getType() === BOOL};
  condprops.rvalSetter = expr.setCond;
  condprops.id = props.id + "." + "3"
  return <ExprComponent props={props} rval={expr} row={false}>
    <div className="flex flex-row space-x-4">
      <KeyWord>
        if
      </KeyWord>
      <SelectExpressionType {...condprops}/>
    </div>
    <div className="flex flex-row divide-x-2">
      <div>
        <KeyWord>
          then
        </KeyWord>
        <CodeBlock {...ifprops}/>
      </div>
    </div>
    </ExprComponent>
}

const While: React.FC<Props> = (props) => {
  let expr = new WhileExpr(props.lineNumer,props.context.block);
  let ifcontext = new Context(props.context.functionIn, props.context);
  let ifprops = new Props(ifcontext,0);
  ifprops.rvalSetter = expr.setIf;
  ifprops.content = props.content.concat("_while_block");
  ifprops.id = props.id + "." + "0";

  let condprops = props.copy();
  condprops.typeFilter = (e: Expression) => {return e.getType() == BOOL};
  condprops.rvalSetter = expr.setCond;
  condprops.id = props.id + "." + "3"
  return <ExprComponent props={props} rval={expr} row={false}>
    <div className="flex flex-row space-x-4">
      <KeyWord>
        while
      </KeyWord>
      <SelectExpressionType {...condprops}/>
    </div>
    <div className="flex flex-row divide-x-2">
      <div>
        <KeyWord>
          do
        </KeyWord>
        <CodeBlock {...ifprops}/>
      </div>
    </div>

    </ExprComponent>
}

const FunctionDef: React.FC<Props> = (props) => {
  const [name, setName] = useQueryState('fnname'+props.id,'function_name',(s:string)=>{return s.slice(1,-1);});
  const [numArgs, setNumArgs] = useQueryState('numArgs'+props.id,0,(s: string)=>{return parseInt(s);});
  const [returnType, setType] = useState(new FunctionExpr(name, new Type("")));
  let context = new Context(returnType, props.context);

  let nameProps = new Props(context,0,updateName);
  nameProps.content=name;

  let initProps = new Props(context,0,updateName);
  initProps.typeSetter = updateType;

  returnType.name = name;

  if (name!='function_name'){
    props.context.update_name(name,name,props.lineNumer,returnType);
  }
  function updateName(newName: string){
    props.context.update_name(name,newName,props.lineNumer,returnType);
    returnType.name = newName;
    setName(newName);
    setType(returnType);
  }

  function updateType(newType: Type){
    returnType.retType = newType
    if(props.rvalSetter){
      props.rvalSetter(returnType);
    }
    setType(returnType);
  }

  function updateNthArgType(n: number){
    return (newType: Expression) => {
      let t: Type = returnType.getType() as Type
      if (t.args){
        t.args[n] = newType.getType() as Type;
      }
      returnType.params[n] = newType as ParamExpr;
      props.context.set(name,returnType);
      context.set(returnType.params[n]?.ident as string,newType);
      if(props.rvalSetter){
        props.rvalSetter(returnType);
      }
    setType(returnType);
    }
  }

  function addArg(){
    let t = returnType.getType() as Type;
    if (t.args){
      t.args.push(new Type(""));
    }
    setNumArgs(numArgs+1);
    setType(returnType);
  }

  function removeArg(){
    if(numArgs == 0){return;}
    let t = returnType.getType() as Type;
    if (t.args){
      t.args.pop();
    }
    setNumArgs(numArgs-1);
    setType(returnType);
  }

  let numArr = [];
  for (let i = 0; i < numArgs; i++){
    numArr.push(i);
  }
  

  let codeBlockProps = new Props(context, 0);
  codeBlockProps.rvalSetter = returnType.setChild;
  codeBlockProps.content = name;
  codeBlockProps.id = props.id;

  if(props.rvalSetter){
    props.rvalSetter(returnType);
  }

  function nthProp(n: number){
    let ret = new Props(context,n,undefined,updateNthArgType(n));
    ret.id = props.id + "." +JSON.stringify(n);
    return ret;
  }

  return <div className="border-2 flex flex-col space-y-1 font-mono bg-gray-50">
    <div className="flex flex-row space-x-1 items-center">
      <KeyWord>
      function
      </KeyWord>
      <NewVar {...nameProps}/>
      <div>(</div>
      {numArr.map((i) => <Param key={i} {...nthProp(i)} />)}
      <div className="flex flex-col">
        <a className={button} onClick={() => addArg()}>+</a>
        <a className={button} onClick={() => removeArg()}>-</a>
      </div>
      <div>) =&gt; </div>
      <SelectType {...initProps}/>
    </div>
    <CodeBlock {...codeBlockProps}/>
  </div>
}