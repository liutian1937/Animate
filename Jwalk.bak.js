(function(){
	var Unit = (function () {
		var style = document.documentElement.style, self = {};
		//each函数，封装for循环
		function _each (arr, fn) {
			var i = 0, len = arr.length;
			for (; i < len; i += 1){
				fn(arr[i]);
			}
		};
		//获取css3前缀
		var _prefix = (function () {
			var head = ['t', 'webkitT', 'MozT', 'msT', 'OT'], transform, ret;
			_each(head, function (val) {
				transform = val + 'ransform';
				if (transform in style) {
					ret = val.substr(0,val.length - 1);
				}
			});
			return ret;
		})();
		//扩展函数，克隆对象属性
		self.extend = function (target, obj) {
			for (var i in obj) {
				target[i] = obj[i];
			}
		};
		//拼接css3属性，并返回
		function _prefixStyle (style) {
			if ( _prefix === '' ) return style;
			if (! _prefix ) return false;
			return _prefix + style.charAt(0).toUpperCase() + style.substr(1);
		};
		
		self.extend(self, {
			css3 : _prefixStyle('transition'),
			Transform : _prefixStyle('transform'),
			Property : _prefixStyle('transitionProperty'),
			Duration : _prefixStyle('transitionDuration'),
			TimingFunction : _prefixStyle('transitionTimingFunction')
		});
		return self;
	})();
	
	var Jwalk = function(elem){
		if (!(this instanceof Jwalk)) {
			return new Jwalk (elem);
		};
		this.elem = elem || {};
		this._init(); //初始化
	};
	Jwalk.prototype = {
		_init : function () {
			var _this = this;
			this.speeds = {
				normal : 400 ,
				fast : 200 ,
				slow : 600
			}; //默认的动画执行时间
			this.easing = 'linear'; //默认动作
			this.isAnimate = false; //是否有动作在执行
			this.stepArray = []; //缓存动画数组
			this.current = 0; //当前执行的第几个动作
			this.total = 0; //一共几个动作
			this.once = false; //一个循环是否结束
			_this.control = (function(){
				//用闭包保存动作
				return {
					isProcess : true, //是否开启时时进程
					process : function (){
						_this.isAnimate = true;
					},
					end : function () {
						_this.isAnimate = false;
						if(_this.stepActive){
							_this.once = true;
							//如果单步执行激活，不触发end事件
							return false;
						};
						(_this.current < _this.total - 1) ? (function(){
							_this.current += 1;
							if(!_this.isPause)
							_this.play();
						})() : (function(){
							_this.current = _this.total - 1;
							if( !_this.isPause && _this.infinite){
								_this.replay();
							}else{
								_this.once = true; //一次循环结束
							};
						})();
					}
				}
			})();
		},
		animate : function () {
			/*
				animate完成下列事件：
				1.接收参数
				2.缓存至params对象
				3.实例化Animate，传参params
				4.动画实例加入数组
			*/
			var _this = this, arg = arguments, len = arg.length, params = {};
			if(typeof arg[0] === 'object'){
				//检查animate中传入的参数
				params.style = arg[0];
			}else{
				//console.log('参数不正确');
				return false;
			};
			
			//设置回调
			params.callback = (arg[len - 1] && typeof arg[len - 1] === 'function') ?
			arg[len - 1] :
			function () {};
			
			//设置速度
			params.speed = (arg[1] && typeof arg[1] === 'number') ? 
			arg[1] :
			(function () {
				return (typeof arg[1] === 'string' && arg[1] in _this.speeds) ? 
				_this.speeds[arg[1]] :
				_this.speeds['normal'] ;
			})();
			
			//设置动画效果
			params.easing = (len > 1) ? 
			(function () {
				return (arg[2] && typeof arg[2] === 'string') ? 
				arg[2] :
				(function () {
					return (typeof arg[1] === 'string' && !(arg[1] in _this.speeds)) ?
					arg[1] :
					_this.easing ;
				})();
			})() :
			_this.easing ;
			
			_this.stepArray.push(new Animate(_this.elem, params, _this.control));
			_this.total += 1;
			return _this; //链式操作
		},
		play : function () {
			if(this.once || this.isAnimate){
				return false;
			};
			this.isAnimate = true;
			this.isPause = false;
			if(!this.newStepArray){
				this.newStepArray = this.stepArray.concat();
			};
			this.newStepArray[this.current].play();
		},
		pause : function () {
			this.isAnimate = false;
			this.isPause = true;
			if(!this.newStepArray){
				return false;
			};
			this.newStepArray[this.current].pause();
		},
		step : function () {
			//返回第num个动作
			var i = 0, len, queue;
			this.once = false;
			if(arguments.length > 1){
				this.stepActive = false; //关闭单步执行
				this.newStepArray = [];
				queue = Array.prototype.slice.call(arguments,0);
				for (;i < queue.length ; i += 1) {
					//需要验证数组是否存在
					if(this.stepArray[queue[i]]){
						this.newStepArray.push(this.stepArray[queue[i]]);
					}
				};
				this.total = this.newStepArray.length;
			}else{
				this.once = false;
				this.stepActive = true; //单步执行激活
				this.newStepArray = this.stepArray.concat();
				this.total = this.newStepArray.length;
				if( typeof arguments[0] === 'number' && arguments[0] < this.total ) {
					this.current = Math.ceil(arguments[0]);
				};
			};
			return this;
		},
		replay : function () {
			//重新开始一轮动画
			this.current = 0;
			this.once = false;
			this.stepActive = false; //关闭单步执行
			this.play();
		},
		cycle : function () {
			this.current = 0;
			this.once = false;
			this.stepActive = false; //关闭单步执行
			this.infinite = true; //可以循环
			return this; //链式调用
		}
	};
	
	var Animate = function (elem, params, control) {
		this.elem = elem;
		this.params = params;
		this.remainderTime = 0;//剩余时间
		this.isAnimate = false; //是否有动画
		this.callback = this.params.callback;
		this.control = control; //控制器，用来调用Jwalk的控制器
		this.replay = true; //是否是重新开始的动画
		this.data = {}; //回调数据
		//this.init(this.params.style);
	};
	Animate.prototype = {
		init : function (val) {
			//初始化设置，缓存开始结束时的style样式
			var _this = this, startData, endData, hasProperty = true;
			_this.remainderTime = _this.params.speed; //剩余时间
			_this.replay = false; //是否是重新开始的动画
			_this.startStyle = {}; //动画开始时的样式
			_this.endStyle = {}; //结束时的样式
			_this.pauseStyle = {}; //动画执行过程中的样式，非css3
			_this.data = {}; //回调数据
			
			if(Unit.css3){
				for(var attr in val){
					startData = _this._getStyle(_this.elem, attr); //初始数据				
					endData = (val[attr].match(/^[\-|\+]=?/)) ? 
					(function () {
						return _this._conversion(startData) + _this._conversion(val[attr]) + 'px';
					})() :
					val[attr] ;
					_this.startStyle[attr] = startData;
					_this.endStyle[attr] = endData;
				};
			}else{
				for(var attr in val){
					if(attr === 'opacity'){
						startData = parseInt((_this._getStyle(_this.elem, 'filter')).replace(/[^0-9]/ig,"")) || 100;
						processData = val[attr]*100;
						hasProperty = true;
					}else{
						if(_this._getStyle(_this.elem, attr)){
							hasProperty = true;
							startData = _this._conversion(_this._getStyle(_this.elem, attr));
							processData = (Math.abs(parseInt(val[attr].replace(/=|px|em/g,''))) >= 0) ? _this._conversion(val[attr]) : val[attr];
						}else{
							hasProperty = false;
						}
					};
					if ( hasProperty ) {
						endData = (val[attr].match(/^[\-|\+]=?/)) ? startData + processData : processData;
						_this.startStyle[attr] = startData;
						_this.endStyle[attr] = endData;
					};
				};
				_this.pauseStyle = _this.startStyle;
			};
		},
		play : function () {
			//开始动画
			var _this = this;
			if(_this.isAnimate || _this.data.status === 'play'){
				//动画执行过程中，play失效
				return false;
			};
			if(_this.replay){
				_this.init(_this.params.style); //初始化数据
			};
			
			//执行回调函数
			_this.data.status = 'start';
			_this.callback(_this.data);
			
			if(Unit.css3){
				_this._transition(_this.remainderTime,_this.params.easing);
				_this._css3(_this.endStyle); //继续动画
			}else{
				_this._compute(_this.endStyle);
				_this._run(_this.remainderTime,_this.params.easing);
			};
		},
		process : function () {
			//动画执行过程中
			//如果开启了实时数据，进程执行过程中，返回数据
			var _this = this;
			_this.data.result = {}
			for(var attr in _this.params.style){
				_this.data.result[attr] = _this._getStyle(_this.elem, attr); //时时数据
			};
			_this.data.status = 'process';
			_this.callback(_this.data);
		},
		pause : function () {
			//暂停动画
			var _this = this;
			if(_this.data.status === 'pause'){
				return false;
			};
			if(_this.remainderTime > 0){
				_this.isAnimate = false;
				
				if(Unit.css3){
					for (var attr in _this.startStyle){
						_this.elem.style[attr] = _this._getStyle(_this.elem, attr);
					};				
					clearInterval(_this.timer); //停止计时器
				}else{
					clearTimeout(_this.timer);//停止计时器
				}
			};
			
			//暂停回调
			_this.data.status = 'pause';
			_this.callback(_this.data);
			
		},
		end : function () {
			//动画结束
			var _this = this;
			_this.isAnimate = false; //设置动画状态
			_this.replay = true; //可以重新开始动画
			_this.remainderTime = 0; //剩余时间置为0
			//执行回调函数
			_this.data.status = 'end';
			
			_this.callback(_this.data); //回调函数先执行
			_this.control['end'](); //让Jwalk回调执行
			_this._destory();
		},
		_destory : function () {
			this.startStyle = null;
			this.endStyle = null;
			this.pauseStyle = null;
			this.timer = null; //计时器对象，setTimeout,setInterval
		},
		_transition : function (speed,easing){
			//css3改变transition
			var _this = this;
			_this.elem.style[Unit.Property] = 'all' ;
			_this.elem.style[Unit.Duration] = speed + 'ms';
			_this.elem.style[Unit.TimingFunction] = easing || 'linear';
			
			_this.timer = setInterval(function(){
				_this.isAnimate = true;
				_this.remainderTime = (_this.remainderTime > 0) ? _this.remainderTime - 50 : 0 ; //剩余时间递减
				
				if (_this.control.isProcess) {
					_this.process(); //进程执行中...
				};
				if(_this.remainderTime <= 0){
					//动画结束
					clearInterval(_this.timer);
					_this.end();
				}
			},50);
		},
		_css3 : function(val){
			//设置css3的属性值
			var _this = this;
			for(var attr in val){
				_this.elem.style[attr] = val[attr];
			};
		},
		_compute : function (val) {
			//不支持css3,计算并缓存暂停时的数据
			var _this = this, pauseData;
			for(var attr in val){
				if(attr === 'opacity'){
					pauseData = parseInt((_this._getStyle(_this.elem, 'filter')).replace(/[^0-9]/ig,"")) || 100;
				}else{
					pauseData = _this._conversion(_this._getStyle(_this.elem, attr));
				}
				_this.pauseStyle[attr] = pauseData;
			};
		},
		_run : function(speed, easing){
			//用tween实现动画效果，并设置css样式
			var _this = this, t = 0, d = parseInt(speed/10), tween = (Tween[easing]) ? Tween[easing] : Tween['linear'];
			function Run(){
				if(t < d){
					t++;
					_this.isAnimate = true; //动画执行
					for (var j in _this.pauseStyle){
						if(typeof _this.endStyle[j] === 'number'){
							if(j === 'opacity'){
								_this.elem.style.filter = 'alpha(opacity='+Math.ceil(tween(t,_this.pauseStyle[j],_this.endStyle[j]-_this.pauseStyle[j],d))+')';
							}else{
								_this.elem.style[j] = Math.ceil(tween(t,_this.pauseStyle[j],_this.endStyle[j]-_this.pauseStyle[j],d)) + 'px';
							}
						};
					};
					_this.timer = setTimeout(Run, 10);
					
					if (_this.control.isProcess) {
						_this.process(); //进程执行中...
					};
					
				}else{
					//设置最终效果
					for (var k in _this.endStyle){
						if(typeof _this.endStyle[j] === 'number'){
							if(j === 'opacity'){
								_this.elem.style.filter = 'alpha(opacity='+_this.endStyle['opacity']+')';
							}else{
								_this.elem.style[k] = _this.endStyle[k] + 'px';
							}
						}else{
							_this.elem.style[k] = _this.endStyle[k];
						}
					};
					clearTimeout(_this.timer); //清除计时器
					_this.end(); //动画结束
				};
				_this.remainderTime = (_this.remainderTime > 0) ? _this.remainderTime - 10 : 0 ; //剩余时间递减				
				//console.log(_this.remainderTime); //调试选项，打印剩余时间
			};
			Run();
		},
		_getStyle : function (elem, attr) {
			return (elem.currentStyle? elem.currentStyle : window.getComputedStyle(elem, null))[attr];
		},
		_conversion : function (num) {
			//返回带正负的数值，并换算单位为PX
			var _this = this;
			num = num.replace(/=/g,'');
			if(num.match(/\%/)){
				var width = parseInt(_this.elem.parentNode.scrollWidth);
				return parseInt(num)*width/100;
			};
			return num.match(/em/) ? parseInt(num,10)*16 : parseInt(num,10) ;
		}
	};
	
	//动画算法
	var Tween = {
		'linear': function(t,b,c,d){ return c*t/d + b; },
		'ease-in': function(t, b, c, d) { return -c * Math.cos(t/d *(Math.PI/2)) + c + b; },
		'ease-out': function(t, b, c, d) { return c * Math.sin(t/d *(Math.PI/2)) + b; },
		'ease-in-out': function(t, b, c, d) { return -c/2 *(Math.cos(Math.PI*t/d) - 1) + b; }
	};

	window.Jwalk = Jwalk;
})();
