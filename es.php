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

		$query_data = array(  
		  'query' => array(
		  	'match' => array(
		  		'full_text' => $keyword
		  	)
		  )
		);
		echo "<div>";
		var_dump($query_data);
		echo "</div>";
		$es_url = "http://search.pcitech.cn/stuff/_search";
		$result = $this->send_post($es_url,$query_data);
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

	private function send_post($url,$post_data){
		$postdata=http_build_query($post_data);
		$options=array(
			'http'=>array(
				'method'=>'POST',
				//'header' => 'Content-type:application/json,Authorization:Basic ZWxhc3RpYzpjaGFuZ2VtZQ==',
				'header'=>'Content-type:application/x-www-form-urlencoded,Authorization:Basic ZWxhc3RpYzpjaGFuZ2VtZQ==',
				'content'=>$postdata,
				'timeout'=>15*60 // 超时时间（单位:s）
			)
		);
		$ctx=stream_context_create($options);
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
