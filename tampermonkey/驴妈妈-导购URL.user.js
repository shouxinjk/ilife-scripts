// ==UserScript==
// @name         驴妈妈-导购URL
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract free tour lines
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://union.lvmama.com/tnt_cps/tntCpsUrlTransfer/channelPromotion
// @grant        none
// ==/UserScript==

//示例URL
//https://union.lvmama.com/tnt_cps/tntCpsUrlTransfer/channelPromotion
//在完成登陆后，启动脚本开始自动批量生成导购链接
//1，获取10个待补充条目。条件：source=lvmama && url2 is null
//2，逐个填写，并点击生成按钮，获取目标地址，更新到服务器
//3，完成后获取下一个内容，如果本地为空，则获取另外10个条目，直至结束

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = true;
var items = [];

var remote = "/tnt_cps/tntCpsUrlTransfer/generateCode";
var form = {
    radioVal:"ignore",
    h5Url:"",
    url:"http://dujia.lvmama.com/freetour/429656-D258?losc=222346&ict=i",
    //mediaName:"上色生活",
    //mediaId:"21175"
    //mediaName:"手心健康",
    //mediaId:"23114"
    mediaName:"小确幸大生活",
    mediaId:"24118"
};

var queryTemplate={
    collection : "my_stuff",
    limit:5,//默认每次取5条
    example : {
        source:"lvmama",
        "link.web2":null//TODO：当前不能直接用null值，需要先将字段置空后更新
    }
};

(function() {
    'use strict';
    loadItems();
})();

function generateCode(){
    var item = items.pop()[0];
    if(debug)console.log("processing item.",item,item.url);
    var data={
        _key:item._key,
        url:item.url,//required 作为整条记录唯一识别码
        link:{
            web2:null,
            wap2:null
        }
    };
    webLink(item,data);//处理web链接
    //wapLink(item,data);//处理wap链接:放到webLink回调内
}

function webLink(item,data){
    if(debug)console.log("processing item.",item,item.url);
    form.url = item.link.web;
    if(debug)console.log("processing form.",form);
    $.post(remote,form,function(result){
        if(result.indexOf("+")!=-1){
            data.link.web2 = result.split("+")[0];
        }else{
            data.link.web2=result;
        }
        //commit(item._key,data);
        wapLink(item,data);//继续处理wap链接
    },"text");
}

function wapLink(item,data){
    if(debug)console.log("processing item.",item,item.url);
    form.url = item.link.wap;
    if(debug)console.log("processing form.",form);
    $.post(remote,form,function(result){
        if(result.indexOf("+")!=-1){
            data.link.wap2 = result.split("+")[0];
        }else{
            data.link.wap2=result;
        }
        commit(item._key,data);
    },"text");
}

//commit data
function commit(key,data){
    if(validate(data)){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
    }else{
        if(debug)console.log("validate failed.[prop]"+key,data);
    }
}

//validate url2 is there
function validate(data){
    return data.link.wap2 && data.link.web2; //两者都处理完成后才提交
}

//navigate to next url
function next(){
    console.log("process next item...");
    if(items.length>0){
        generateCode();
    }else{
        loadItems();
    }
}

function loadItems(){
    if(debug)console.log("load pending items.");
    queryData(queryTemplate,function(result){
        if(debug)console.log("got result.",result);
        if(result.count>0){
            items.push(result.result);
            generateCode();//start generate code
        }else{
            if(debug)console.log("no more items");
        }
    })
}


