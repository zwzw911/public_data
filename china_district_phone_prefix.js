/**
 * Created by 张伟 on 2020/3/8.
 * 获得电话区号
 */
'use strict'


const cheerio=require('cheerio')
const fs=require('fs')

const baseUrl='http://www.zou114.com/qh/'
const INTERVAL=0.5 //单位秒
const {ifDirFileExist_async,getPageContent_async}=require('./common_function')




/* 获得省/直辖市/自治区的链接
* @html: url对应的html
* */
function extractProvinceUrl({html}){
    // console.log(html)
    let result={}
    let $=cheerio.load(html)
    let matchedEle=$('p.more50').eq(1)//.children('td').children('a')
    // console.log(typeof matchedEle.html())
    // console.log(matchedEle.length)
    matchedEle=$(matchedEle).children('a')
    matchedEle.each(function (idx,ele) {
        result[$(ele).text()]=baseUrl+$(ele).prop('href')
    })
    return result
}

/* 获得省/直辖市/自治区下的电话分区
* @html: url对应的html
* */
function extractDistrictPhoneCode({html}){
    // console.log(html)
    let result={}
    let $=cheerio.load(html)
    let matchedEle=$('div.nrbnr>p>font>font')

    matchedEle.each(function (idx,ele) {
        if($(ele).text().includes('区号')){
            let tmp=$(ele).text().split(/\s+/)
            result[tmp[3]]=tmp[1]
        }

        // result[$(ele).text()]=baseUrl+$(ele).prop('href')
    })
    // console.log('result',result)
    return result
}

async function main_async(){
    let content
    let result
/*    if(false===await ifDirFileExist_async({dirPath:'./district'})){
        fs.mkdirSync('./district')
    }*/
    content=await getPageContent_async({url:baseUrl,interval:INTERVAL})
    result=extractProvinceUrl({html:content})

    for(let singleProvinceName in result){
        content=await getPageContent_async({url:result[singleProvinceName],interval:INTERVAL})
        result[singleProvinceName]=extractDistrictPhoneCode({html:content})
        console.log('result',result)
    }
}

main_async()
