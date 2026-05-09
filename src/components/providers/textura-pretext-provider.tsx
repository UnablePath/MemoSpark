 'use client';
 
 import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
 
 import type { PreparedText } from '@chenglou/pretext';
 import { prepare as pretextPrepare, layout as pretextLayout } from '@chenglou/pretext';
 
 type TexturaComputeLayout = (tree: unknown, options?: unknown) => unknown;
 
 interface TexturaPretextContextValue {
   isTexturaReady: boolean;
   computeLayout: TexturaComputeLayout | null;
   measureText: (input: {
     text: string;
     font: string;
     width: number;
     lineHeight: number;
     whiteSpace?: 'normal' | 'pre-wrap';
   }) => { height: number; lineCount: number };
 }
 
 const TexturaPretextContext = createContext<TexturaPretextContextValue | null>(null);
 
 function getPretextCacheKey(input: {
   text: string;
   font: string;
   whiteSpace?: 'normal' | 'pre-wrap';
 }) {
   return `${input.font}__${input.whiteSpace ?? 'normal'}__${input.text}`;
 }
 
 export function TexturaPretextProvider({ children }: { children: React.ReactNode }) {
   const [computeLayout, setComputeLayout] = useState<TexturaComputeLayout | null>(null);
   const [isTexturaReady, setIsTexturaReady] = useState(false);
 
   const preparedCacheRef = useRef<Map<string, PreparedText>>(new Map());
 
   useEffect(() => {
     let cancelled = false;
 
     async function initTextura() {
       try {
         // Textura needs Yoga WASM init; keep it client-only and async to protect LCP.
         const textura = await import('textura');
         await textura.init();
 
         if (cancelled) return;
 
         setComputeLayout(() => textura.computeLayout as TexturaComputeLayout);
         setIsTexturaReady(true);
       } catch {
         if (cancelled) return;
         setComputeLayout(null);
         setIsTexturaReady(false);
       }
     }
 
     void initTextura();
 
     return () => {
       cancelled = true;
     };
   }, []);
 
   const measureText = useCallback<TexturaPretextContextValue['measureText']>((input) => {
     const key = getPretextCacheKey(input);
     const cached = preparedCacheRef.current.get(key);
 
     const prepared =
       cached ??
       (() => {
         const next = pretextPrepare(input.text, input.font, {
           whiteSpace: input.whiteSpace ?? 'normal',
         });
         preparedCacheRef.current.set(key, next);
         return next;
       })();
 
     return pretextLayout(prepared, input.width, input.lineHeight);
   }, []);
 
   const value = useMemo<TexturaPretextContextValue>(
     () => ({
       isTexturaReady,
       computeLayout,
       measureText,
     }),
     [computeLayout, isTexturaReady, measureText],
   );
 
   return <TexturaPretextContext.Provider value={value}>{children}</TexturaPretextContext.Provider>;
 }
 
 export function useTexturaPretext() {
   const ctx = useContext(TexturaPretextContext);
   if (!ctx) {
     throw new Error('useTexturaPretext must be used within TexturaPretextProvider');
   }
   return ctx;
 }
 
