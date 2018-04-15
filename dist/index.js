"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
// createReglaze returns an object {state$, dispatch}
// reglazer is the user provided function that is similar to the redux reduce function
var createReglaze = function (reglazer, init, action$$) {
    var state$ = new rxjs_1.Observable(function (observer) {
        var current = init;
        var action$ = action$$.pipe(operators_1.flatMap(function (a$) { return a$; }));
        var subscription = action$
            .pipe(operators_1.map(function (action) {
            return reglazer(current, action, state$, action$);
        }))
            .subscribe(function (_a) {
            var state = _a[0], action$ = _a[1];
            current = state;
            observer.next(state);
            action$$.next(action$);
        });
        return function () {
            subscription.unsubscribe();
        };
    });
    return {
        state$: state$.pipe(operators_1.publishBehavior(init), operators_1.refCount()),
        dispatch: function (action) {
            action$$.next(rxjs_1.of(action));
        }
    };
};
var createConnect = function (Consumer) {
    return function (WrappedComponent, mapState$ToProps, mapDispatchToProps) {
        var Connect = /** @class */ (function (_super) {
            __extends(Connect, _super);
            function Connect(props) {
                var _this = _super.call(this, props) || this;
                var dispatch = _this.props.store.dispatch;
                _this.state = {};
                _this.subs = [];
                _this.mappedDispatches = Object.keys(mapDispatchToProps).reduce(function (acc, key) {
                    var value = mapDispatchToProps[key];
                    acc[key] = function interceptAction() {
                        var action = value.apply(null, arguments);
                        dispatch(action);
                    };
                    return acc;
                }, {});
                return _this;
            }
            Connect.prototype.componentDidMount = function () {
                var _this = this;
                var _loop_1 = function (key) {
                    this_1.subs = this_1.subs.concat([
                        mapState$ToProps[key](this_1.props.store.state$).subscribe(function (value) {
                            _this.setState(function (prevState) {
                                // return {...prevState, { [key]:value}}
                                return Object.assign({}, prevState, (_a = {}, _a[key] = value, _a));
                                var _a;
                            });
                        })
                    ]);
                };
                var this_1 = this;
                for (var key in mapState$ToProps) {
                    _loop_1(key);
                }
            };
            Connect.prototype.componentWillUnmount = function () {
                for (var _i = 0, _a = this.subs; _i < _a.length; _i++) {
                    var sub = _a[_i];
                    sub.unsubscribe();
                }
            };
            Connect.prototype.render = function () {
                // copy everything but "store" from the context into the wrapped component
                // const { store, ...props } = this.props;
                var props = Object.assign({}, this.props);
                delete props["store"];
                return (React.createElement(WrappedComponent, __assign({}, props, this.state, this.mappedDispatches)));
            };
            return Connect;
        }(React.Component));
        return function (props) {
            return (React.createElement(Consumer, null, function (store) { return React.createElement(Connect, __assign({ store: store }, props)); }));
        };
    };
};
// createContext accepts a reglazer function to handle state transitions and specify side-effects
// and an initial state. createContext returns a Provider and Consumer context. The Consumer context
// provides access to the reglaze prop which is an object of state$ and dispatch.
exports.createContext = function (reglazer, init) {
    var action$$ = new rxjs_1.Subject();
    var _a = React.createContext({}), Provider = _a.Provider, Consumer = _a.Consumer;
    var _b = createReglaze(reglazer, init, action$$), state$ = _b.state$, dispatch = _b.dispatch;
    var reglaze = {
        state$: state$,
        dispatch: dispatch
    };
    // WrappedProvider makes it more convenient as the user shouldn't need to track and provide the value prop
    var WrappedProvider = function (props) {
        return React.createElement(Provider, __assign({ value: reglaze }, props));
    };
    return {
        connect: createConnect(Consumer),
        Provider: WrappedProvider,
        Consumer: Consumer
    };
};
