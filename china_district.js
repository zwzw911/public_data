/**
 * Created by 张伟 on 2020/3/4.
 * 获得中国行政区的名称
 */
'use strict'


const cheerio=require('cheerio')
const fs=require('fs')
const baseUrl='http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2018/index.html'

const {ifDirFileExist_async,getPageContent_async}=require('./common_function')

const SELECTOR={
    CITY:'tr.citytr',
    COUNTY:'tr.countytr',
    TOWN:'tr.towntr',
}



/* 获得省/直辖市/自治区名称和url
* @html: url对应的html
* @url: 用来生成子页面的url
* */
function extractProvinceInfo({html,url}){
    // console.log(html)
    let result={}
    let $=cheerio.load(html)
    let matchedEle=$('tr.provincetr>td>a')//.children('td').children('a')
    // console.log(typeof matchedEle.html())
    // console.log(matchedEle.html())

    matchedEle.each(function (idx,ele) {
        if(undefined!==$(ele).text()){
            // console.log($(ele).text(),$(ele).prop('href'))
            result[$(ele).text()]=url.replace('index.html',$(ele).prop('href'))
        }

    })
    return result
}

/* 获得市/区县/乡镇街道的信息
* @html: url对应的html
* @currentUrl: 当前页面的url
* @selector: city/county/town的页面结构类似，除了class不一样，所以用一个函数代替
* */
function extractCityCountyTownInfo({html,currentUrl,selector}){
    // console.log(html)
    let result={}
    let $=cheerio.load(html)
    let matchedEle=$(selector)//.children('td').children('a')
    // console.log(typeof matchedEle.html())
    // console.log(matchedEle.length)

    matchedEle.each(function (idx,ele) {
        let realEle=$(ele).children('td').children('a').eq(1)
        if(undefined!==$(realEle).text() && ''!==$(realEle).text()){
            // console.log($(realEle).text(),$(realEle).prop('href'))
            //替换url中最后一个地址
            //http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2018/11.html   页面中对应的href为11/1101.html，那么删除11，换上11/1101.html
            //http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2018/11/1101.html
            let tmp=currentUrl.split('/')
            tmp[tmp.length-1]=$(realEle).prop('href')
            result[$(realEle).text()]=tmp.join('/')
        }

    })
    return result
}


async function main_async(){
    let content
    let result
    if(false===await ifDirFileExist_async({dirPath:'./district'})){
        fs.mkdirSync('./district')
    }
    content=await getPageContent_async({url:baseUrl,interval:0})
    result=extractProvinceInfo({html:content,url:baseUrl})
    for(let singleProvinceName in result){
        //省直辖市自治区信息写入单个json文件
        let destFilePath=`./district/${singleProvinceName}.json`
        //文件存在，无需再次获取
        if(await ifDirFileExist_async({dirPath:destFilePath})){
            continue
        }
        // console.log('singleProvinceName ',singleProvinceName)
        // console.log('singleProvince url ',result[singleProvinceName])
        content=await getPageContent_async({url:result[singleProvinceName],interval:0})
        result[singleProvinceName]=extractCityCountyTownInfo({html:content,currentUrl:result[singleProvinceName],selector:SELECTOR.CITY})
        for(let singleCityName in result[singleProvinceName]){
            console.log('singleCityName ',singleCityName)
            // console.log('singleCityName url ',result[singleProvinceName][singleCityName])
            content=await getPageContent_async({url:result[singleProvinceName][singleCityName],interval:0})
            result[singleProvinceName][singleCityName]=extractCityCountyTownInfo({html:content,currentUrl:result[singleProvinceName][singleCityName],selector:SELECTOR.COUNTY})
            // console.log('cityinto: ',result[singleProvinceName][singleCityName])
            for(let singleCountyName in result[singleProvinceName][singleCityName]){
                console.log('singleCountyName ',singleCountyName)
                // console.log('singleCountyName url ',result[singleProvinceName][singleCityName][singleCountyName])
                content=await getPageContent_async({url:result[singleProvinceName][singleCityName][singleCountyName],interval:0})
                result[singleProvinceName][singleCityName][singleCountyName]=extractCityCountyTownInfo({html:content,currentUrl:result[singleProvinceName][singleCityName][singleCountyName],selector:SELECTOR.TOWN})
                // console.log('towninfo: ',result[singleProvinceName][singleCityName][singleCountyName])
            }
        }
        fs.writeFileSync(destFilePath, JSON.stringify(result[singleProvinceName],undefined,'    '))
    }
    fs.writeFileSync('./district/总和.json', JSON.stringify(result,undefined,'    '))
    // console.log(result)
    // console.log( extractInfo({html:content}))
}

main_async()
