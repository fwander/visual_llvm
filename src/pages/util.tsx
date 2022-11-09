import { Context } from ".";

export let zip = (a1: any, a2: any) => a1.map((x: any, i: any) => [x, a2[i]]);

export const remove = (context: Context, linenumber: number) =>{
  for (var expr of context.exprs){
    if(expr.lineNumber == linenumber){
      context.del(context.names[expr.lineNumber] as string);
    }
  }
}