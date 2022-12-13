//_debug 
var _debug=false;

var _meta_item=JSON.stringify({
    status:{
        crawl:"ready",
        sync:"pending",
        load:"pending",
        classify: "pending",
        measure: "pending",
        evaluate: "pending",
        index: "pending",
        monitize: "pending",
        poetize: "pending",
        satisify: "pending"
    },
    timestamp:{
        crawl:new Date()
    }
});

//commitTimer
var _sxTimer = null;
var _sxDataReceived = null;//milliseconds while receiving data
var _sxDuration = 2000;//milliseconds from data received to commit

//data api
var _spi = 'https://data.shouxinjk.net/_db/sea/_api/document/';
var _spi_query = 'https://data.shouxinjk.net/_db/sea/_api/simple/by-example';
var _spi_aql = 'https://data.shouxinjk.net/_db/sea/_api/cursor';
var _spi_api = 'https://data.shouxinjk.net/_db/sea/';//foxx service api root
var _sx_api = 'https://data.shouxinjk.net/ilife/a';//ilife-admin api root
var _query=
    {
        collection: "my_stuff", 
        example: { 
            _key :null
        } 
    };

var _query_seed=
    {
        collection: "seeds", 
        example:{
            status:"new"//查询状态为new的待采集链接
        },
        limit:1
    };

//auth
var _auth = 'Basic aWxpZmU6aWxpZmU=';

//pending urls
var _seeds=[];

//check production mode
function isProduction(client){
    //here we can control client
    return !_debug;
}

//create a new seed
function commitUrl(data,callback){
     __postData("seeds", data,callback);
}

//create a new item
function commitData(data,callback){
    //set initially received time 
    if(!_sxDataReceived){
        _sxDataReceived = new Date().getTime();
    }    
    //check duration and clear timer
    if(_sxTimer && new Date().getTime()-_sxDataReceived < _sxDuration){
        if(_debug)console.log("try to clear timer for too frequent data commit.");
        clearTimeout(_sxTimer);   
        _sxTimer = null;
    }
    //(re)start a new timer to commit data
    _sxTimer = setTimeout(function(){
        if(_debug)console.log("commit data timer start.",data);
        __commitData(data,callback);
    },_sxDuration);    
    //设置数据接收时间
    _sxDataReceived = new Date().getTime();

}

//仅对已经存在的数据进行补充。如果不存在则直接报错，不予处理
function patchData(data,callback){
    data._key = hex_md5(data.url);//generate _key manually
    //if(_debug)
        console.log("try to patch data."+data._key,data);
     __update(_spi+"my_stuff/"+data._key,data,callback);
}

function __commitData(data,callback){
    //check category mapping and then post data to server
    var checkCategorySpi = _sx_api+"/mod/platformCategory/rest/mapping";
    var checkCategoryData={
        platform:data.source,
        name:data.category?data.category:""
    };
    checkCategorySpi = checkCategorySpi+"?platform="+checkCategoryData.platform+"&name="+encodeURIComponent(checkCategoryData.name);
    if(_debug)console.log("\n\ncheck category\n\n.[url]"+checkCategorySpi,checkCategoryData);
    var req = new XMLHttpRequest();
    req.open('GET', checkCategorySpi, true);//query to check if exists
    //req.setRequestHeader('Content-Type', 'application/json');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {//got result
                var result = JSON.parse(req.responseText);
                if(_debug)console.log("\n\ncheck category result.",result);
                //update meta.category
                if(result.success && result.data && result.data.length>0 && result.data[0].category ){
                    data.meta = {
                        category:result.data[0].category.id,
                        categoryName:result.data[0].category.name
                    };
                    console.log("check item status.",data);
                    if(!data.status)data.status={};
                    data.status.classify = "ready";
                    if(!data.timestamp)data.timestamp={};
                    data.timestamp.classify = new Date();
                    if(_debug)console.log("\n\n data with category info.",data);
                }

                //post  data to local storage
                data._key = hex_md5(data.url);//generate _key manually
                const mergedData = {//merge meta data
                    ...data,//注意：合并时是覆盖，需要将状态放在后面
                    ...JSON.parse(_meta_item),                    
                };
                if(data.status&&data.status.sync)mergedData.status.sync=data.status.sync;
                if(data.meta && data.meta.category)mergedData.status.classify="ready";
                if(data.timestamp && data.timestamp.classify)mergedData.timestamp.classify=data.timestamp.classify;
                if(_debug)console.log("try to send local storage",JSON.stringify(mergedData).length,mergedData);
                __postMessage(mergedData); //commit to local storage

                //if(_debug)
                console.log("trigger data commit.",mergedData);
                __postData("my_stuff", mergedData,callback);

            } else {//query error
                if(_debug)console.log(JSON.parse(req.responseText));
            }
        }else{
            console.log("check category mapping error.");
        }
    };
    req.onerror = function() {//在查询类目出错时，也需要将数据回传到本地，并发起提交
        //post  data to local storage
        data._key = hex_md5(data.url);//generate _key manually
        const mergedData = {//merge meta data
            ...data,
          ...JSON.parse(_meta_item)
        };
        if(data.status&&data.status.sync)mergedData.status.sync=data.status.sync;
        if(data.meta && data.meta.category)mergedData.status.classify="ready";
        if(data.timestamp && data.timestamp.classify)mergedData.timestamp.classify=data.timestamp.classify;
        if(_debug)console.log("try to send local storage",JSON.stringify(mergedData).length,mergedData);
        __postMessage(mergedData); //commit to local storage

        if(_debug)
            console.log("trigger data commit.",mergedData);
        __postData("my_stuff", mergedData,callback);
    };    
    try{
        //req.send(JSON.stringify(checkCategoryData));//put query
        req.send();//get 
    }catch(e){
        if(_debug)console.log("Error while checking data if exists."+e);
    }
}

//update broker seed
function commitBrokerSeed(data,callback){
     __update(_spi+"broker_seeds/"+data._key,data,callback);
}
function commitBrokerSeeds(data,callback){
     __ajax(_spi_aql,data,"POST",callback);
}

//提交新的prop_values
function commitPropValues(data,callback){
     __ajax(_spi+"prop_values",data,"POST",callback);
}

//get full url
function fullUrl(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.href;
}

//pivate method
//新建数据。
function __postData(collection,data,callback){
    if(_debug)console.log("check if data exists.[spi.url]"+_spi+collection,"[data.url]"+data.url);
    var _key = hex_md5(data.url);
    var req = new XMLHttpRequest();
    _query.collection = collection;
    _query.example._key = _key;
    req.open('PUT', _spi_query, true);//query to check if exists
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', _auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {//got result
                var result = JSON.parse(req.responseText);
                if(_debug)console.log("\n\ncheck result.",result,result.count);
                //result.count === 0 ? __create(_spi+collection,data,callback) : __update(_spi+collection+"/"+_key,data,callback);
                if(result.count == 0 ){//创建新的数据
                    __create(_spi+collection,data,callback);
                }else{//更新已有数据，注意：对于props等数组需要预先处理，避免导致数据覆盖
                    if(data.props && Array.isArray(data.props)){//仅在有属性列表需要更新的情况下才处理：兼容props为数组的情况
                        if(_debug)console.log("\n\ncheck result.",result.result);
                        var props = result.result[0].props?result.result[0].props:[];
                        //以下方法比较笨：通过转换[]为{}，逐个赋值
                        var json = {};
                        props.forEach((item, index) => {//将新的元素加入或覆盖
                            if(_debug)console.log("foreach old props.[index]"+index,item,props);
                            for (var key in item) {
                               json[key]=item[key];
                            }
                        });
                        if(_debug)console.log("old props.",json);   
                        //使用新的数值替换或增加
                        data.props.forEach((item, index) => {//将新的元素加入或覆盖
                            if(_debug)console.log("foreach new props.[index]"+index,item,props);
                            for (var key in item) {
                               json[key]=item[key];
                            }
                        });
                        if(_debug)console.log("new props.",json);  
                        //转换数组赋值  
                        props = []; //初始置空
                        for (var key in json) {
                            if(_debug)console.log("merge props.",key,json[key]);
                            var prop = {};
                            prop[key]=json[key];
                            props.push(prop);

                        }                                                       
                        data.props = props;
                        if(_debug)console.log("commit merged props.",data);
                    }
                    __update(_spi+collection+"/"+_key,data,callback);
                }
            } else {//query error
                if(_debug)console.log(JSON.parse(req.responseText));
            }
        }
    };
    try{
        req.send(JSON.stringify(_query));//put query
    }catch(e){
        if(_debug)console.log("Error while checking data if exists."+e);
    }
}

//private method
//create a new document
function __create(url,data,callback){
    if(_debug)console.log("create new document against "+url,data);
    var req = new XMLHttpRequest();
    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', _auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {
                if(_debug)console.log("commit successfully. got callback",JSON.parse(req.responseText),req);
                /**
                //将meta数据、提交的item数据、返回结果合并作为item，存储到本地
                var res = JSON.parse(req.responseText);
                const mergedData = {
                  ...JSON.parse(_meta_item),
                  ...data,
                  ...res
                };
                //提交到本地：返回数据带有_key等信息
                if(_debug)console.log("commit successfully. got callback",mergedData);
                __postMessage(mergedData);    
                //**/             
            } else {
                // Handle error case
            }
            if(callback && typeof callback == 'function'){
                callback();
            }
        }
    };
    req.onerror = function(jqXHR, textStatus, errorThrown){
        //do nothing
        console.log("create document error.",jqXHR,textStatus,errorThrown);
    };
    data._key = hex_md5(data.url);
    //自动添加meta数据
    const mergedData = {
        ...data,
        ...JSON.parse(_meta_item)
    };
    if(data.status&&data.status.sync)mergedData.status.sync=data.status.sync;
    if(data.meta && data.meta.category)mergedData.status.classify="ready";
    if(data.timestamp && data.timestamp.classify)mergedData.timestamp.classify=data.timestamp.classify;    
    //提交到本地：由于网络存在中断情况，先提交到本地，在控制面板中显示
    //if(_debug)console.log("try to send local storage",mergedData);
    //__postMessage(mergedData);     
    //提交到服务器
    console.log("try to send create data.",mergedData);
    try{
        req.send(JSON.stringify(mergedData));//post data       
    }catch(e){
        if(_debug)console.log("Error while update data to create new document."+e);
    }
}

//private method
//update an exist document
function __update(url,data,callback){
    if(_debug)console.log("update exist document against "+url,data);
    var req = new XMLHttpRequest();
    req.open('PATCH', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', _auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {
                if(_debug)console.log("commit successfully. got callback",JSON.parse(req.responseText),req);
                //将meta数据、提交的item数据、返回结果合并作为item，存储到本地
                /**
                var res = JSON.parse(req.responseText);
                const mergedData = {
                  ...JSON.parse(_meta_item),
                  ...data,
                  ...res
                };
                //提交到本地：返回数据带有_key等信息
                if(_debug)console.log("commit successfully. got callback",mergedData);
                __postMessage(mergedData);     
                //**/            
            } else {
                // Handle error case
            }
            if(callback && typeof callback == 'function'){
                callback();
            }
        }
    };
    req.onerror = function(jqXHR, textStatus, errorThrown){
        //do nothing
        console.log("update document error.",jqXHR,textStatus,errorThrown);
    };    
    try{
        delNullProperty(data)//删除其中空值，仅仅更新有数据的部分，避免数据覆盖
        //自动添加meta数据
        const mergedData = {
            ...data,
          ...JSON.parse(_meta_item)
        };
        if(data.status&&data.status.sync)mergedData.status.sync=data.status.sync;
        if(data.meta && data.meta.category)mergedData.status.classify="ready";
        if(data.timestamp && data.timestamp.classify)mergedData.timestamp.classify=data.timestamp.classify;        
        //if(_debug)
            console.log("try to send update data.",mergedData);        
        req.send(JSON.stringify(mergedData));//post data       
        //提交到本地：由于网络存在中断情况，此处先提交到本地，在控制面板中显示
        //if(_debug)console.log("try to send local storage",mergedData);
        //__postMessage(mergedData);         
    }catch(e){
        if(_debug)console.log("Error while update data to create new document."+e);
    }
}

function queryData(query,callback){
    __ajax(_spi_query,query,"PUT",callback);
}

//每次获取1条seed
function _querySeeds(query,callback){
    __ajax(_spi_query,query,"PUT",callback);
}

//将护具提交给本地。约定向指定frame发消息
function __postMessage(item){
    if(_debug)console.log("try to post message to local cookie. ",item);
    if(item.logo && item.logo.trim().length>5){
        //已经设置有item.logo，直接使用
    }else if(item.images && item.images.length>0){//否则设置iteimagem.logo
        item.logo = item.images[0];
        //delete item.images;//重要：由于使用cookie做本地缓存，过长的url导致超出4096限制，无法存储
    }
    if(document.getElementById('sxListFrame')){
        console.log("post message to  local cookie. ",JSON.stringify(item).length,item);
        document.getElementById('sxListFrame').contentWindow.postMessage({
          sxCookie:{
            action:"save",
            key:"sxPendingItem",
            value:item
          }
        }, "*");     
    }
}

//自动查询后跳转到下一个地址
function _next(){
    _querySeeds(_query_seed,function(result){
        if(result.count>0){
            //将seed链接状态更改为 done
            var seed = result.result[0];
            seed.status = "done";
            if(_debug)console.log("now change seed status.",seed);
            __postData("seeds", seed,function(res){
                if(_debug)console.log("change seed status done and try to redirect to next one",seed);
                //控制浏览器跳转到新页面
                window.location.href = result.result[0].url;                
            });
        }else{
            if(_debug)console.log("no more pending url:s");
        }
    });
}

//private method
//generl method
function __ajax(url,data,method="GET",callback){
    if(_debug)console.log("AJAX "+url,data,method);
    var req = new XMLHttpRequest();
    req.open(method, url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.setRequestHeader('Authorization', _auth);
    req.setRequestHeader('Api-Key', 'foobar');
    req.onreadystatechange = function() {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 400) {
                if(callback && typeof callback == 'function'){
                    callback(JSON.parse(req.responseText));
                }
            } else {
                // Handle error case
            }
        }
    };
    try{
        req.send(JSON.stringify(data));//post data
    }catch(e){
        if(_debug)console.log("AJAX error."+e);
    }
}


//从链接中获取参数
function _getQuery(full_url=window.location.search) {
    //取得查询字符串并去掉开头的问号
    var qs = full_url.length > 0 ? full_url.substring(1):"";
    //保存数据的对象
    var args = {};
    //取得每一项
    var items = qs.length > 0 ? qs.split('&'):[];
    var item = null,name = null,value = null;
    for(var i = 0;i < items.length;i++) {
        item = items[i].split('=');
        name = decodeURIComponent(item[0]);
        value = decodeURIComponent(item[1]);
        if(name.length) {
            args[name] = value;
        }
    }
    return args;
}

//遍历删除对象中的空值属性
function delNullProperty(obj){
    for( let i in obj ){//遍历对象中的属性
        if(obj[i] === undefined || obj[i] === null || obj[i] === ""){//首先除去常规空数据，用delete关键字
            delete obj[i]
        }else if(obj[i].constructor === Object){//如果发现该属性的值还是一个对象，再判空后进行迭代调用
            if(Object.keys(obj[i]).length === 0) delete obj[i]//判断对象上是否存在属性，如果为空对象则删除
            delNullProperty(obj[i])
        }else if(obj[i].constructor === Array){//对象值如果是数组，判断是否为空数组后进入数据遍历判空逻辑
            if( obj[i].length === 0 ){//如果数组为空则删除
                delete obj[i]
            }else{
                for( let index = 0 ; index < obj[i].length ; index++){//遍历数组
                    if(obj[i][index] === undefined || obj[i][index] === null || obj[i][index] === "" || JSON.stringify(obj[i][index]) === "{}" ){
                        obj[i].splice(index,1)//如果数组值为以上空值则修改数组长度，移除空值下标后续值依次提前
                        index--//由于数组当前下标内容已经被替换成下一个值，所以计数器需要自减以抵消之后的自增
                    }
                    if(obj[i].constructor === Object){//如果发现数组值中有对象，则再次进入迭代
                        delNullProperty(obj[i])
                    }
                }
            }
        }
    }
}

//从cookie中获取缓存的值，采用json字符串存储
function getSxCookie(key){
    console.log("got cookie.",document.cookie);
    var cookieArray = document.cookie.split(';');
    for(var i=0;i<cookieArray.length;i++){
        var name = key+"=";
        if(cookieArray[i].indexOf(name)==0){
            return JSON.parse(cookieArray[i].substring(name.length, cookieArray[i].length));
        }
    }
    return {};
}

//向cookie中写入缓存值，采用json字符串存储
function addSxCookie(key,json){
    console.log("got cookie for adding.",document.cookie);
    var cookieArray = document.cookie.split(';');
    var cookieStr = "";
    for(var i=0;i<cookieArray.length;i++){
        var name = key+"=";
        if(cookieArray[i].indexOf(name)<0){
            cookieStr += cookieArray[i]+";"
        }
    }
    cookieStr+=key+"="+JSON.stringify(json);
    document.cookie = cookieStr;
}