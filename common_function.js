/**
 * Created by 张伟 on 2020/3/5.
 */
'use strict'
const fs=require('fs')
const rp=require('request-promise-native')
const iconv=require('iconv-lite')



async function ifDirFileExist_async({dirPath}){
    return new Promise(function (resolve,reject) {
        fs.access(dirPath,err => {
            if(err){
                resolve(false)
            }else{
                resolve(true)
            }
        })
    })
}
/*  根据url，获得整个页面的内容（html）
* @interval:最大间隔时间。产生一个位于0到interval之间的随机数，作为每次请求的间隔时间。单位：秒
* */
async function getPageContent_async({url,interval=1}){
    let option={
        url:url,
        resolveWithFullResponse: true, //包含header，以便通过statusCode判断response是否成功（200/304/502/504）
        encoding:null,//必须设置成null，以便返回buffer，然后通过iconv-lite转换，因为有些网页采用gb2312编码，而rp不支持encoding设成gb2312
        // encoding:'utf-8',
    }

    return new Promise(function(resolve, reject){
        rp(option).then(
            function(content){
                // console.log('statusCode',content.statusCode)
                // console.log('typeof content: ',typeof content)
                // console.log(content.body)
                // resolve(content.body)
                let waitTime=parseInt(Math.random()*interval*1000)
                console.log('wait time:',waitTime)
                if(content.statusCode===200){
                    setTimeout(function () {
                        resolve(iconv.decode(content.body,'gb2312'))
                    },waitTime)

                }

            },
            function(err){
                resolve(false)
            },
        )
    })
}



module.exports={
    ifDirFileExist_async,
    getPageContent_async,
}