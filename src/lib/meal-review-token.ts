import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http";
export function signMealReview(value:unknown,purpose:string){
 const encoded=Buffer.from(JSON.stringify(value)).toString("base64url");
 const sig=createHmac("sha256",process.env.NEXTAUTH_SECRET!).update(purpose+":"+encoded).digest("base64url");return encoded+"."+sig;
}
export function readMealReview<T>(token:string,purpose:string):T{
 const [encoded,sig,...rest]=token.split(".");if(!encoded||!sig||rest.length)throw new HttpError(400,"Review token unavailable.");
 const expected=createHmac("sha256",process.env.NEXTAUTH_SECRET!).update(purpose+":"+encoded).digest();const supplied=Buffer.from(sig,"base64url");
 if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))throw new HttpError(400,"Review token unavailable.");
 try{return JSON.parse(Buffer.from(encoded,"base64url").toString()) as T}catch{throw new HttpError(400,"Review token unavailable.")}
}
