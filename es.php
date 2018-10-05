<?php
/**
  * wechat php test
  */

//define your token
define("TOKEN", "qchzhu");
$wechatObj = new wechatCallbackapiTest();

//for token validation
//$wechatObj->valid();

//for auto-responding
$wechatObj->responseMsg();

class wechatCallbackapiTest
{
	public function valid()
    {
        $echoStr = $_GET["echostr"];

        //valid signature , option
        if($this->checkSignature()){
        	echo $echoStr;
        	exit;
        }
    }

    public function responseMsg()
    {
        $keyword = "亲子";

		$itemList = "";
		$itemCount = 0;			 
/*
		$query_data = array(  
		  'query' => array(
		  	'match' => array(
		  		'full_text' => $keyword
		  	)
		  )
		);
//*/
$query_data='{
    "query": {
        "match" : { 
          "full_text":"亲子" 
        }
    }
}';
		echo "<div>";
		var_export($query_data);
		echo "</div>";
		$es_url = "http://search.pcitech.cn/stuff/_search";
		//$result = $this->send_post($es_url,$query_data);
		$result = $this->send_request($es_url,$query_data,null,'POST','application/json');
		echo "<div>".$result."</div>";
		echo "<div>dump result <br/>";
		var_dump($result);
		echo "</div>";
		$json = json_decode($result);
		$hits = $json->hits;
		for($i=0;$i<$hits->total;$i++){
			if($itemCount>4)//we only display 4 items for mobile
				break;
			$object = $hits->hits[$i]->_source;
			$tagstr="";
			for($k=0;$k<count($object->tags);$k++){
				$tag = $object->tags[$k];
				$tagstr = $tagstr." ".$tag;
			}
			$title = $object->title.$tagstr; // title is a field of your content type
			$description = $object->summary;
			$picUrl = 	$object->images[0];//取第一张照片作为LOGO							
			$linkUrl = "http://www.shouxinjk.net/list/info.html?id=".$object->_key;
			$itemStr = sprintf($itemTpl,$title,$description,$picUrl,$linkUrl);
			$itemList = $itemList.$itemStr;
			$itemCount ++;
		}
    }

/**
 * 发送HTTP请求
 *
 * @param string $url 请求地址
 * @param string $method 请求方式 GET/POST
 * @param string $refererUrl 请求来源地址
 * @param array $data 发送数据
 * @param string $contentType 
 * @param string $timeout
 * @param string $proxy
 * @return boolean
 */
function send_request($url, $data, $refererUrl = '', $method = 'GET', $contentType = 'application/json', $timeout = 30, $proxy = false) {
    $ch = null;
    if('POST' === strtoupper($method)) {
    	$header =array();
		$header[] ='Authorization:Basic ZWxhc3RpYzpjaGFuZ2VtZQ==';
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HEADER,0 );
        curl_setopt($ch, CURLOPT_FRESH_CONNECT, 1);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_FORBID_REUSE, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        if ($refererUrl) {
            curl_setopt($ch, CURLOPT_REFERER, $refererUrl);
        }
        if($contentType) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:'.$contentType));
            $header[] ='Content-Type:'.$contentType;
        }
        if(is_string($data)){
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        }
        curl_setopt($ch,CURLOPT_HTTPHEADER,$header);
    } else if('GET' === strtoupper($method)) {
        if(is_string($data)) {
            $real_url = $url. (strpos($url, '?') === false ? '?' : ''). $data;
        } else {
            $real_url = $url. (strpos($url, '?') === false ? '?' : ''). http_build_query($data);
        }
        $ch = curl_init($real_url);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:'.$contentType));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        if ($refererUrl) {
            curl_setopt($ch, CURLOPT_REFERER, $refererUrl);
        }
    } else {
        $args = func_get_args();
        return false;
    }
    if($proxy) {
        curl_setopt($ch, CURLOPT_PROXY, $proxy);
    }

		echo "<div>dump post request <br/>";
		var_dump($ch);
		echo "</div>";

    $ret = curl_exec($ch);
    $info = curl_getinfo($ch);
    $contents = array(
            'httpInfo' => array(
                    'send' => $data,
                    'url' => $url,
                    'ret' => $ret,
                    'http' => $info,
            )
    );
    curl_close($ch);
    return $ret;
}    

	private function send_post($url,$post_data){
		$postdata=http_build_query($post_data);
		echo "<div>---[url]".$url."[postdata] <br/>";
		echo $postdata;
		echo "</div>";		
		$options=array(
			'http'=>array(
				'method'=>'POST',
				//'header' => 'Content-type:application/json,Authorization:Basic ZWxhc3RpYzpjaGFuZ2VtZQ==',
				'header'=>'Content-type:application/x-www-form-urlencoded,Authorization:Basic ZWxhc3RpYzpjaGFuZ2VtZQ==',
				'content'=>$postdata,
				'timeout'=>15*60
			)
		);
		$ctx=stream_context_create($options);
		echo "<div>dump context <br/>";
		var_dump($ctx);
		echo "</div>";
		$result=file_get_contents($url,false,$ctx);
		return $result;
	}
}

//避免找不到函数定义，此处未引用其他类库，创建新函数
if (!function_exists('http_build_query')) {
	function http_build_query($data, $prefix='', $sep='', $key='') {
	   $ret = array();
	   foreach ((array)$data as $k => $v) {
	       if (is_int($k) && $prefix != null) $k = urlencode($prefix . $k);
	       if (!empty($key)) $k = $key.'['.urlencode($k).']';
	       
	       if (is_array($v) || is_object($v))
	           array_push($ret, http_build_query($v, '', $sep, $k));
	       else    array_push($ret, $k.'='.urlencode($v));
	   }
	 
	   if (empty($sep)) $sep = ini_get('arg_separator.output');
	   return implode($sep, $ret);
	}
}

?>
