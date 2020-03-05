/**
 * Created by 张伟 on 2020/3/4.
 * 获得国家代号已经电话号码前缀
 */
'use strict'


const cheerio=require('cheerio')
const fs=require('fs')

const baseUrl='http://www1.jctrans.com/tool/dm.htm'

const {ifDirFileExist_async,getPageContent_async}=require('./common_function')




/* 获得国家名称，缩写和电话前缀
* @html: url对应的html
* @selector: 选择html元素的选择器
* */
function extractCountryPhonePrefixInfo({html}){
    // console.log(html)
    let result={}
    let $=cheerio.load(html)
    let matchedEle=$('tr')//.children('td').children('a')
    // console.log(typeof matchedEle.html())
    // console.log(matchedEle.length)

    matchedEle.each(function (idx,ele) {
        let chineseCountryName=$(ele).children('td').eq(1).children('font')
        let abbr=$(ele).children('td').eq(2).children('font')
        let phonePrefix=$(ele).children('td').eq(3).children('font')
        if(''!==$(chineseCountryName).text()){
            console.log('country:',$(chineseCountryName).text(),'abbr:',$(abbr).text(),'phonePrefix:',$(phonePrefix).text())
        }


    })
    return result
}


async function main_async(){
    let content
    let result
/*    if(false===await ifDirFileExist_async({dirPath:'./district'})){
        fs.mkdirSync('./district')
    }*/
    content=await getPageContent_async({url:baseUrl})
    extractCountryPhonePrefixInfo({html:content})
}

main_async()
