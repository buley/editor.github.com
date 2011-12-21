
var Waldo = Waldo || {};
Waldo.logging = true;
(function () {
    var keys = {

    };
    var el = document.getElementsByTagName('canvas');
    var that = this;
    this.Mouse = {};

    if (el) {
        for (var x = 0; x < el.length; x += 1) {
            if ('undefined' !== typeof el[x]) {
                that.Mouse[el[x].id] = that.Mouse[el[x].id] || {};
                that.Mouse[el[x].id]['page'] = that.Mouse[el[x].id]['page'] || {};
                that.Mouse[el[x].id]['offset'] = that.Mouse[el[x].id]['offset'] || {};
                if ('undefined' === typeof that.Mouse[el[x].id]['offset'].x) {
                    that.Mouse[el[x].id]['offset'].x = el[x].offsetLeft;

                }
                if ('undefined' === typeof that.Mouse[el[x].id]['offset'].y) {
                    that.Mouse[el[x].id]['offset'].y = el[x].offsetTop;
                }
                var parent = el[x].parentNode;
                while (parent && parent.tagName && parent.tagName.toLowerCase() !== "body") {
                    that.Mouse[el[x].id]['offset'].x += parent.offsetLeft;
                    that.Mouse[el[x].id]['offset'].y += parent.offsetTop;
                    parent = parent.parentNode.tagName;
                }
                el[x].onmousemove = function (event) {
                    that.Mouse[event.target.id]['page'] = {
                        x: event.pageX,
                        y: event.pageY
                    };

                }
                el[x].onclick = function (event) {
                    show(event);
                }
            }
        }

    } else {
        show("Can't find a canvas call on this page");
    }

    function show(event) {
        var cursor = Mouse[event.target.id];
        if ( !! Waldo.logging) {
            console.log(Mouse, event);
            console.log("#" + event.target.id, (cursor.page.x - cursor.offset.x), (cursor.page.y - cursor.offset.y));
        }
        var style = {
            cursor: 'pointer',
            textAlign: 'left',
            listStyle: 'none',
            font: 'bold 15px "Lucida Grande"',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            BorderRadius: '5px',
            MozBorderRadius: '5px',
            WebkitBorderRadius: '5px',
            borderTop: 'solid 1px rgba(255, 255, 255, 0.4)',
            borderLeft: 'solid 1px rgba(0, 0, 0, 0.8)',
            borderRight: 'solid 1px rgba(0, 0, 0, 0.8)',
            borderBottom: 'solid 1px #000',
            textShadow: '0 1px 0 #000',
            BoxShadow: '0 -1px 0 #000',
            MozBoxShadow: '0 -1px 0 #000',
            WebkitBoxShadow: '0 -1px 0 #000',
            position: 'fixed',
            padding: '10px',
            margin: '0',
            right: '10px',
            'top': '10px',
            zIndex: 1000
        };
        var el = document.getElementById('_waldo');
        if (el) {
            el.parentNode.removeChild(el);
        } 
        var props = {
            id: '_waldo',
            innerHTML: "#" + event.target.id + ': ' + (cursor.page.x - cursor.offset.x) + ',' + (cursor.page.y - cursor.offset.y),
            onclick: function () {
                this.parentNode.removeChild(this);
            }
        };
        var el = document.createElement('div');
        for (var key in props) {
            el[key] = props[key];
        }
        for (var key in style) {
            el.style[key] = style[key];
        }
        document.body.appendChild(el);
    }
})()
