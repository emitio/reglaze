import * as React from "react";
import { of, Observable, Subject } from "rxjs";
import { flatMap, map, publishBehavior, refCount } from "rxjs/operators";

let contexts: any = {};

// createReglaze returns an object {state$, dispatch}
// reglazer is the user provided function that is similar to the redux reduce function
const createReglaze = (reglazer: any, init: any, action$$: Subject<any>) => {
  const state$ = new Observable(observer => {
    let current = init;
    const action$ = action$$.pipe(flatMap(a$ => a$));
    const subscription = action$
      .pipe(
        map(action => {
          return reglazer(current, action, state$, action$);
        })
      )
      .subscribe(([state, action$]) => {
        current = state;
        observer.next(state);
        action$$.next(action$);
      });
    return () => {
      subscription.unsubscribe();
    };
  });
  return {
    state$: state$.pipe(publishBehavior(init), refCount()),
    dispatch: action => {
      action$$.next(of(action));
    }
  };
};

export const connect = (
  symbol,
  WrappedComponent,
  mapState$ToProps,
  mapDispatchToProps
) => {
  class Connect extends React.Component<any, any> {
    constructor(props: any) {
      super(props);
      const { dispatch } = this.props.store;
      this.state = {};
      this.subs = [];
      this.mappedDispatches = Object.keys(mapDispatchToProps).reduce(
        (acc, key) => {
          const value = mapDispatchToProps[key];
          acc[key] = function interceptAction() {
            const action = value.apply(null, arguments);
            dispatch(action);
          };
          return acc;
        },
        {}
      );
    }
    componentDidMount() {
      for (let key in mapState$ToProps) {
        this.subs = [
          ...this.subs,
          ...[
            mapState$ToProps[key](this.props.store.state$).subscribe(value => {
              this.setState(prevState => {
                // return {...prevState, { [key]:value}}
                return Object.assign({}, prevState, { [key]: value });
              });
            })
          ]
        ];
      }
    }
    componentWillUnmount() {
      for (let sub of this.subs) {
        sub.unsubscribe();
      }
    }
    render() {
      // copy everything but "store" from the context into the wrapped component
      // const { store, ...props } = this.props;
      let props = Object.assign({}, this.props);
      delete props["store"];
      return (
        <WrappedComponent
          {...props}
          {...this.state}
          {...this.mappedDispatches}
        />
      );
    }
  }
  return props => {
    if (!contexts[symbol]) {
      throw new Error(`could not find provided context by symbol=${symbol}`);
    }
    const { Consumer } = contexts[symbol];
    return <Consumer>{store => <Connect store={store} {...props} />}</Consumer>;
  };
};

// createContext accepts a reglazer function to handle state transitions and specify side-effects
// and an initial state. createContext returns a Provider and Consumer context. The Consumer context
// provides access to the reglaze prop which is an object of state$ and dispatch.
export const createContext = (symbol, reglazer, init) => {
  const action$$ = new Subject();
  const { Provider, Consumer } = React.createContext({});
  const { state$, dispatch } = createReglaze(reglazer, init, action$$);
  const reglaze = {
    state$,
    dispatch
  };
  // WrappedProvider makes it more convenient as the user shouldn't need to track and provide the value prop
  const WrappedProvider = props => {
    return <Provider value={reglaze} {...props} />;
  };
  contexts[symbol] = {
    Provider: WrappedProvider,
    Consumer
  };
  return contexts[symbol];
};
