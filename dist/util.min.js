//_debug 
var _debug=false;

var _meta_item=JSON.stringify({
    status:{
        crawl:"ready",
        sync:"pending",
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

//data api
var _spi = 'https://data.shouxinjk.net/_db/sea/_api/document/';
var _spi_query = 'https://data.shouxinjk.net/_db/sea/_api/simple/by-example';
var _spi_aql = 'https://data.shouxinjk.net/_db/sea/_api/cursor';
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
    return _debug;
}

//create a new seed
function commitUrl(data,callback){
     __postData("seeds", data,callback);
}

//create a new item
function commitData(data,callback){
    __postData("my_stuff", data,callback);
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
                result.count === 0 ? __create(_spi+collection,data,callback) : __update(_spi+collection+"/"+_key,data,callback);
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
                if(_debug)console.log(JSON.parse(req.responseText));
            } else {
                // Handle error case
            }
            if(callback && typeof callback == 'function'){
                callback();
            }
        }
    };
    data._key = hex_md5(data.url);
    //自动添加meta数据
    const mergedData = {
      ...JSON.parse(_meta_item),
      ...data
    };
    console.log("try to send data.",mergedData);
    try{
        req.send(JSON.stringify(mergedData));//post data
        //提交到本地：默认直接提交，不考虑网络因素
        __postMessage(data);        
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
                if(_debug)console.log(JSON.parse(req.responseText));
            } else {
                // Handle error case
            }
            if(callback && typeof callback == 'function'){
                callback();
            }
        }
    };
    try{
        delNullProperty(data)//删除其中空值，仅仅更新有数据的部分，避免数据覆盖
        //自动添加meta数据
        const mergedData = {
          ...JSON.parse(_meta_item),
          ...data
        };
        console.log("try to send data.",mergedData);        
        req.send(JSON.stringify(mergedData));//post data
        //提交到本地:默认直接提交，不考虑网络因素
        __postMessage(data);        
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
    console.log("try to post message to local cookie. ",item);
    if(document.getElementById('sxListFrame')){
        console.log("post message to  local cookie. ",item);
        document.getElementById('sxListFrame').contentWindow.postMessage({
          sxCookie:{
            action:"save",
            key:"sxItem",
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