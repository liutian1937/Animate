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
		this.speeds = {
			normal : 400 ,
			fast : 200 ,
			slow : 600
		}; //默认的动画执行时间
		this.easing = 'linear'; //默认动作
		this._init(); //初始化
	};
	Jwalk.prototype = {
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
			/*
			params.callback = (arg[len - 1] && typeof arg[len - 1] === 'function') ?
			arg[len - 1] :
			function () {};
			*/
			
			params.callback = (function(){
				return function (data, fn) {
					if(arg[len - 1] && typeof arg[len - 1] === 'function') {
						arg[len - 1](data);
					};
					if(fn){
						fn();
					};
				}
			})();
			
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
			params.startStyle = {};
			params.endStyle = {};
			params.pauseStyle = {};
			params.remainderTime = params.speed;
			
			_this.stepArray.push(params); //缓存动画数组

			_this.total += 1;
			return _this; //链式操作
		},
		play : function (replay) {
			var obj;
			if(this.once || this.isAnimate){
				return false;
			};
			this.isAnimate = true;
			if(!this.newStepArray){
				this.newStepArray = this.stepArray.concat();
			};
			obj = this.newStepArray[this.current];
			if (!replay && this.data.status === 'pause') {
				//如果不是replay，那么继续暂停时的动作
				this._move(obj);
			}else{
				this._initStyle(obj, this.finalStyle);
			};
		},
		pause : function () {
			var obj, elem = this.elem;
			if(!this.newStepArray || !this.isAnimate || this.data.status === 'pause'){
				return false;
			};
			this.isAnimate = false;
			obj = this.newStepArray[this.current];
			
			if( obj.remainderTime > 0 ){
				this.isAnimate = false;
				
				if(Unit.css3){
					for (var attr in obj.startStyle){
						elem.style[attr] = this._getStyle(elem, attr);
					};
					clearInterval(this.timer); //停止计时器
				}else{
					this._compute(obj, obj.endStyle);
					clearTimeout(this.timer);//停止计时器
				}
			};
			
			//暂停回调
			this.data.status = 'pause';
			obj.callback(this.data);
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
			this._initData();
			this.play(true);
		},
		reset : function () {
			if(this.isAnimate){
				return false;
			};
			this._initData();
			for (var attr in this.elem.style){
				if(this.elem.style[attr])
				this.elem.style[attr] = this.beginStyle[attr];
			};
		},
		cycle : function () {
			//循环动画
			this.current = 0;
			this.once = false;
			this.stepActive = false; //关闭单步执行
			this.infinite = true; //可以循环
			this.play();
			//return this; //链式调用
		},
		_init : function () {
			//初始化
			var _this = this;
			this.isAnimate = false; //是否有动作在执行
			this.stepArray = []; //缓存动画数组
			this.current = 0; //当前执行的第几个动作
			this.total = 0; //一共几个动作
			this.once = false; //一个循环是否结束
			this.data = {}; //回调数据
			this.finalStyle = null; //每次执行的最终结果
			
			this.beginStyle = {}; //动画开始的样式
			for (var attr in this.elem.style){
				this.beginStyle[attr] = _this._getStyle(_this.elem, attr);
			};
			
			_this.control = (function(){
				//用闭包保存动作
				return {
					isProcess : true, //是否开启时时进程
					process : function (obj){
						//动画执行过程中
						//如果开启了实时数据，进程执行过程中，返回数据
						_this.data.result = {}
						for(var attr in obj.style){
							_this.data.result[attr] = _this._getStyle(_this.elem, attr); //时时数据
						};
						_this.data.status = 'process';
						//console.log(_this.data.result);
						obj.callback(_this.data);
					},
					end : function (obj) {
						_this.isAnimate = false;
						if(_this.stepActive){
							_this.once = true;
							//如果单步执行激活，不触发end事件
							return false;
						};
						(_this.current < _this.total - 1) ? (function(){
							_this.current += 1;
							if(_this.data.status !== 'pause')
							_this.play();
						})() : (function(){
							_this.current = 0;
							if( _this.data.status !== 'pause' && _this.infinite){
								_this.replay();
							}else{
								_this.once = true; //一次循环结束
							};
						})();
					}
				}
			})();
		},
		_initData : function () {
			this.current = 0;
			this.once = false;
			this.finalStyle = null;
			this.stepActive = false; //关闭单步执行
			this.data.status = '';
		},
		_initStyle : function (obj, start) {
			var _this = this, val = obj.style, startData, endData, hasProperty;
			if(Unit.css3){
				for(var attr in val){
					if (start && start[attr]){
						//如果传入了开始的样式
						startData = start[attr];
					}else{
						startData = _this._getStyle(_this.elem, attr); //初始数据
					};		
					endData = (val[attr].match(/^[\-|\+]=?/)) ? 
					(function () {
						return _this._conversion(startData) + _this._conversion(val[attr]) + 'px';
					})() :
					val[attr] ;
					obj.startStyle[attr] = startData;
					obj.endStyle[attr] = endData;
				};
			}else{
				for(var attr in val){
						if(attr === 'opacity'){
							if (start && start[attr]){
								//如果传入了开始的样式
								startData = start[attr];
							}else{
								startData = parseInt((_this._getStyle(_this.elem, 'filter')).replace(/[^0-9]/ig,"")) || 100;
							}
							processData = val[attr]*100;
							hasProperty = true;
						}else{
							if(_this._getStyle(_this.elem, attr)){
								hasProperty = true;
								if (start && start[attr]){
									//如果传入了开始的样式
									startData = start[attr];
								}else{
									startData = _this._conversion(_this._getStyle(_this.elem, attr));
								}
								processData = (Math.abs(parseInt(val[attr].replace(/=|px|em/g,''))) >= 0) ? _this._conversion(val[attr]) : val[attr];
							}else{
								hasProperty = false;
							}
						};

					if ( hasProperty ) {
						endData = (val[attr].match(/^[\-|\+]=?/)) ? startData + processData : processData;
						obj.startStyle[attr] = startData;
						obj.endStyle[attr] = endData;
					};
				};
				obj.pauseStyle = obj.startStyle;
			};
			this.finalStyle = obj.endStyle;
			
			//执行回调函数，开始
			_this.data.status = 'start';
			obj.callback(_this.data);
			
			obj.remainderTime = obj.speed;
			_this._move(obj);
		},
		_move : function (obj) {
			if(Unit.css3){
				this._transition(obj, obj.remainderTime, obj.easing);
				this._css3(obj.endStyle); //继续动画
			}else{
				this._run(obj, obj.remainderTime, obj.easing);
			};
			this.data.status = 'process';
		},
		_transition : function (obj, speed, easing){
			//css3改变transition
			var _this = this;
			_this.elem.style[Unit.Property] = 'all' ;
			_this.elem.style[Unit.Duration] = speed + 'ms';
			_this.elem.style[Unit.TimingFunction] = easing || 'linear';
			
			_this.timer = setInterval(function(){
				_this.isAnimate = true;
				obj.remainderTime = (obj.remainderTime > 0) ? obj.remainderTime - 50 : 0 ; //剩余时间递减
				
				if (_this.control.isProcess) {
					_this.control.process(obj); //进程执行中...
				};
				if(obj.remainderTime <= 0){
					//动画结束
					clearInterval(_this.timer);
					
					_this.data.status = 'end';
					obj.callback(_this.data,function(){
						_this.control.end(obj); //结束的回调函数
					});
				}
			},50);
		},
		_css3 : function(val){
			//设置css3的属性值
			for(var attr in val){
				this.elem.style[attr] = val[attr];
			};
		},
		_compute : function (obj, val) {
			//不支持css3,计算并缓存暂停时的数据
			var _this = this, pauseData;
			for(var attr in val){
				if(attr === 'opacity'){
					pauseData = parseInt((_this._getStyle(_this.elem, 'filter')).replace(/[^0-9]/ig,"")) || 100;
				}else{
					pauseData = _this._conversion(_this._getStyle(_this.elem, attr));
				}
				obj.pauseStyle[attr] = pauseData;
			};
		},
		_run : function(obj, speed, easing){
			//用tween实现动画效果，并设置css样式
			var _this = this, t = 0, d = parseInt(speed/10), styles = _this.elem.style, start = obj.pauseStyle, end = obj.endStyle, tween = (Tween[easing]) ? Tween[easing] : Tween['linear'];
			function Run(){
				if(t < d){
					t++;
					_this.isAnimate = true; //动画执行
					for (var j in start){
						if(typeof end[j] === 'number'){
							if(j === 'opacity'){
								styles['filter'] = 'alpha(opacity='+Math.ceil(tween(t,start[j],end[j]-start[j],d))+')';
							}else{
								styles[j] = Math.ceil(tween(t,start[j],end[j]-start[j],d)) + 'px';
							}
						};
					};
					_this.timer = setTimeout(Run, 10);
					
					if (_this.control.isProcess) {
						_this.control.process(obj); //进程执行中...
					};
					
				}else{
					//设置最终效果
					for (var k in end){
						if(typeof end[j] === 'number'){
							if(j === 'opacity'){
								styles['filter'] = 'alpha(opacity='+end['opacity']+')';
							}else{
								styles[k] = end[k] + 'px';
							}
						}else{
							styles[k] = end[k];
						}
					};
					clearTimeout(_this.timer); //清除计时器
					
					_this.data.status = 'end';
					obj.callback(_this.data);
					_this.control.end(obj); //结束的回调函数
				};
				obj.remainderTime = (obj.remainderTime > 0) ? obj.remainderTime - 10 : 0 ; //剩余时间递减				
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
