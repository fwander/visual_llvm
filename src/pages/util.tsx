import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";
import { useEffect, useState } from "react";
import { Context } from ".";

export let zip = (a1: any, a2: any) => a1.map((x: any, i: any) => [x, a2[i]]);

export const remove = (context: Context, linenumber: number) =>{
  for (var expr of context.exprs){
    if(expr.lineNumber == linenumber){
      context.del(context.names[expr.lineNumber] as string);
    }
  }
}


export function useQueryState<T>(thisid: string ,initialState: T,deserialize: (s:string)=>T):[T,(t:T)=>void] {
  const router = useRouter();

  function getState(){
    let content = router.query[thisid];
    if (content != undefined) return deserialize(content as string);
    return undefined
  }

  let s = getState();
  const [state, setState] = useState(s? s:initialState);

  useEffect(() => {
    let s = getState();
    if (s != undefined) setState(s);
  }, [router.query]);

  const setQueryParams = (q: T) => {
    let adding = router.query;
    adding[thisid] = JSON.stringify(q);
    router.push({ pathname: router.pathname, query:adding }, undefined, {
      shallow: true,
    });
  };

  return [state, setQueryParams];
};