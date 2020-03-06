/**
 * Created by 张伟 on 2020/3/4.
 * 获得中国行政区的名称
 */
'use strict'


const cheerio=require('cheerio')
const fs=require('fs')
const baseUrl='http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2019/index.html'

const {ifDirFileExist_async,getPageContent_async}=require('./common_function')

const SELECTOR={
    CITY:'tr.citytr',
    COUNTY:'tr.countytr',
    TOWN:'tr.towntr',
}

const SAVE_DIR=`./district/`
const INTERVAL=0.5  // 单位：秒

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


function genErrorWhenHandleRawData({provinceName, cityName, countyName,message}){
    console.error('省: ',provinceName,'市: ',cityName,'区县: ',countyName, '错误: ', message)
}
/*  传入townInfo，对名称处理，并返回数组
* @townInfo: county下的数据，是object
* @provinceName, cityName, countyName: 用于定位错误发生的位置，可以为undefined
* return：数组
*
* 1. 获得keys，变成一个数组（抛弃html的链接（town下的居委页面））
* 2. 对数组进行处理：（以下步骤必须按照顺序处理）
*   2.1  删除元素  服务滨海新区建设管理委员会/蓟县新城建设管理委员会
*   2.2  元素中删除 街道办事处/地区办事处/街道/
*   2.3  元素中删除  管理委员会
* */
function handleTownInfo({provinceName, cityName, countyName,townInfo}){
    // console.log(townInfo)
    let result=[]
    let allTownName=Object.keys(townInfo)
    // console.log(allTownName)
    //检测townInfo是否为空
    if(allTownName.length===0){
        genErrorWhenHandleRawData({provinceName:provinceName, cityName:cityName, countyName:countyName,message:'无任何乡镇信息'})
    }
    for(let ele of allTownName){
        // console.log('orig ele:',ele)
        // console.log('typeof ele',typeof ele)
        //2.1  删除元素  服务滨海新区建设管理委员会/蓟县新城建设管理委员会
        if(true===['服务滨海新区建设管理委员会','蓟县新城建设管理委员会'].includes(ele)){
            continue
        }
        //2.2 元素中删除 街道办事处/地区办事处/街道/
        ele=ele.replace(/街道办事处|地区办事处|街道/,'')
        // ele=ele.replace('街道办事处','')
        //2.3  元素中删除  管理委员会
        ele=ele.replace(/管理委员会/,'')
        // console.log('handled ele:',ele)
        result.push(ele)
    }
    return result
}

/*  处理county信息
* @countyInfo: city 下的数据，是object
* @provinceName, cityName, countyName: 用于定位错误发生的位置，可以为undefined
*
* 如果只有一个key（一般是市辖区），那么将其下的内容向上提升（不要出现市辖区）
* */
function handleCountyInfo({provinceName, cityName, countyName,countyInfo}){
    if(Object.keys(countyInfo).length===0){
        genErrorWhenHandleRawData({provinceName:provinceName, cityName:cityName, countyName:countyName,message:'无任何区县信息'})
    }
    if(Object.keys(countyInfo).length===1){
        let key=Object.keys(countyInfo)[0]
        console.log('county key is 1', key)
        return countyInfo[key]
    }
    return countyInfo
}

/*  处理city信息
* @cityInfo: city 下的数据，是object
* @provinceName, cityName, countyName: 用于定位错误发生的位置，可以为undefined
*
* 如果只有一个key（一般是市辖区），那么将其下的内容向上提升（不要出现市辖区）
* */
function handleCityInfo({provinceName, cityName, countyName,cityInfo}){
    let result={}
    let allCountyName=Object.keys(cityInfo)
    if(allCountyName.length===0){
        genErrorWhenHandleRawData({provinceName:provinceName, cityName:cityName, countyName:countyName,message:'无任何区县信息'})
    }
    for(let singleCountyName in cityInfo ){
        if(singleCountyName==='市辖区'){
            Object.assign(result,cityInfo['市辖区'])
        }
        if(singleCountyName==='县'){
            Object.assign(result,cityInfo['县'])
        }
    }

    return cityInfo
}

/*  处理 province 信息
* @provinceInfo: province 下的数据，是object
* @provinceName, cityName, countyName: 用于定位错误发生的位置，可以为undefined
*
* 如果只有一个key（一般是市辖区），那么将其下的内容向上提升（不要出现市辖区）
* */
function handleProvinceInfo({provinceName, cityName, countyName,provinceInfo}){
    let result={}
    let allCountyName=Object.keys(provinceInfo)
    if(allCountyName.length===0){
        genErrorWhenHandleRawData({provinceName:provinceName, cityName:cityName, countyName:countyName,message:'无任何市信息'})
    }
    for(let singleCityName in provinceInfo ){

        if(true===['市辖区','县'].includes(singleCityName) ){
            for(let singleCountyName in provinceInfo[singleCityName]){
                // console.log('singleCountyName ',singleCountyName)
                result[singleCountyName]=provinceInfo[singleCityName][singleCountyName]
                // Object.assign(result,provinceInfo[singleCityName][singleCountyName])
            }
        }else{
            result[singleCityName]=provinceInfo[singleCityName]
            // Object.assign(result,provinceInfo[singleCityName])
        }

    }

    return result
}

/*
* @saveDir：结果文件保存的目录
* */
async function getAllDataAndStoreIntoFile_async({saveDir=SAVE_DIR}){
    let content
    let result
    if(false===await ifDirFileExist_async({dirPath:saveDir})){
        fs.mkdirSync(saveDir)
    }
    content=await getPageContent_async({url:baseUrl,interval:INTERVAL})
    result=extractProvinceInfo({html:content,url:baseUrl})
    for(let singleProvinceName in result){
        //省直辖市自治区信息写入单个json文件
        let destFilePath=`${saveDir}/${singleProvinceName}.json`
        //文件存在，无需再次获取
        if(await ifDirFileExist_async({dirPath:destFilePath})){
            continue
        }
        // console.log('singleProvinceName ',singleProvinceName)
        // console.log('singleProvince url ',result[singleProvinceName])
        content=await getPageContent_async({url:result[singleProvinceName],interval:INTERVAL})
        result[singleProvinceName]=extractCityCountyTownInfo({html:content,currentUrl:result[singleProvinceName],selector:SELECTOR.CITY})
        for(let singleCityName in result[singleProvinceName]){
            console.log('singleCityName ',singleCityName)
            // console.log('singleCityName url ',result[singleProvinceName][singleCityName])
            content=await getPageContent_async({url:result[singleProvinceName][singleCityName],interval:INTERVAL})
            result[singleProvinceName][singleCityName]=extractCityCountyTownInfo({html:content,currentUrl:result[singleProvinceName][singleCityName],selector:SELECTOR.COUNTY})
            // console.log('cityinto: ',result[singleProvinceName][singleCityName])
            for(let singleCountyName in result[singleProvinceName][singleCityName]){
                console.log('singleCountyName ',singleCountyName)
                // console.log('singleCountyName url ',result[singleProvinceName][singleCityName][singleCountyName])
                content=await getPageContent_async({url:result[singleProvinceName][singleCityName][singleCountyName],interval:INTERVAL})
                result[singleProvinceName][singleCityName][singleCountyName]=extractCityCountyTownInfo({html:content,currentUrl:result[singleProvinceName][singleCityName][singleCountyName],selector:SELECTOR.TOWN})
                // console.log('towninfo: ',result[singleProvinceName][singleCityName][singleCountyName])
            }
        }
        fs.writeFileSync(destFilePath, JSON.stringify(result[singleProvinceName],undefined,'    '))
    }
    fs.writeFileSync(`${saveDir}/总和.json`, JSON.stringify(result,undefined,'    '))
    // console.log(result)
    // console.log( extractInfo({html:content}))
}


/*  对保存为文件的数据进行处理，直接返回json数据（而不是再次写入文件）
*
* */
async function handleRawDataFromFile_async({saveDir=SAVE_DIR,fileName}){
    let rawData=JSON.parse(fs.readFileSync(`${saveDir}${fileName}`))
    // console.log('rawData',rawData)
    if('总和.json'===fileName){
        for(let singleProvinceName in rawData){
            for(let singleCityName in rawData[singleProvinceName]){
                for(let singleCountyName in rawData[singleProvinceName][singleCityName]){
                    let result=handleTownInfo({provinceName:singleProvinceName,cityName:singleCityName,countyName:singleCountyName,townInfo:rawData[singleProvinceName][singleCityName][singleCountyName]})
                    console.log(result)
                }
            }
        }
        fs.writeFileSync(`${saveDir}${fileName}_new`,JSON.stringify(rawData,undefined,'    '))
    }else{
        for(let singleCityName in rawData){

            for(let singleCountyName in rawData[singleCityName]){
                rawData[singleCityName][singleCountyName]=handleTownInfo({provinceName:fileName.replace('.json',''),cityName:singleCityName,countyName:singleCountyName,townInfo:rawData[singleCityName][singleCountyName]})
                // console.log(result)

            }
            // rawData[singleCityName]=handleCountyInfo({provinceName:fileName.replace('.json',''),cityName:singleCityName,countyName:undefined,countyInfo:rawData[singleCityName]})
        }
        // rawData=handleCityInfo({provinceName:fileName.replace('.json',''),cityName:undefined,countyName:undefined,cityInfo:rawData})
        let result=handleProvinceInfo({provinceName:fileName.replace('.json',''), cityName:undefined, countyName:undefined,provinceInfo:rawData})
        fs.writeFileSync(`${saveDir}${fileName}_new`,JSON.stringify(result,undefined,'    '))
    }

}


async function main_async(){
    await getAllDataAndStoreIntoFile_async({})
    // await handleRawDataFromFile_async({fileName:'重庆市.json'})
}
main_async()
