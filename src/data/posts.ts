import {getCollection} from 'astro:content';
export async function getPosts(){return (await getCollection('blog',({data})=>!data.draft)).sort((a,b)=>b.data.pubDate.valueOf()-a.data.pubDate.valueOf()||a.id.localeCompare(b.id));}
export const date=(d:Date)=>d.toISOString().slice(0,10).replaceAll('-','.');
export const readingTime=(body='')=>Math.max(1,Math.ceil((body.match(/[㐀-鿿]/g)||[]).length/350+(body.match(/[A-Za-z]+/g)||[]).length/220));
