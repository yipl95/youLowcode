import React from 'react';
import { useComponentConfigStore } from '@/stores/component-config';
import { setComponentRef } from '@/stores/component-ref';
import { Component, useComponetsStore } from '@/stores/components';
import { usePageDataStore } from '@/stores/page-data';
import { execEventFlow } from '@/utils/action';


const ProdStage: React.FC = () => {

  const { components } = useComponetsStore();
  const { data } = usePageDataStore();
  const { componentConfig } = useComponentConfigStore();


  // 处理组件props
  function formatProps(component: Component) {
    const props = Object.keys(component.props || {})
      .reduce<any>((prev, cur) => {
        // 如果组件属性是对象，则判断是静态值还是变量
        if (typeof component.props[cur] === 'object') {
          // 如果是静态值，则直接赋值。 如果是变量，则取变量中的默认值
          if (component.props[cur]?.type === 'static') {
            prev[cur] = component.props[cur].value;
          } else if (component.props[cur]?.type === 'variable') {
            const variableName = component.props[cur].value;
            // 如果data中有值，则取data中的值。否则取变量的默认值
            prev[cur] = data[variableName];
          }
        } else {
          prev[cur] = component.props[cur];
        }

        return prev;
      }, {});
    return props;
  }

  // 处理事件
  function handleEvent(component: Component) {
    const props: any = {};

    const events = componentConfig?.[component.name]?.events;

    if (!events?.length) {
      return props;
    }

    events.forEach((event: any) => {
      const eventConfig = component.props[event.name];

      if (eventConfig) {
        props[event.name] = (params: any) => {
          eventConfig.children && execEventFlow(eventConfig.children, params, params);
        }
      }
    })

    return props;
  }

  function renderComponents(components: Component[]): React.ReactNode {
    return components.map((component: Component) => {

      if (!componentConfig[component.name]?.prod) {
        return null;
      }

      if (component.hidden?.type === 'static' && component.hidden?.value) {
        return null;
      }

      if (
        component.hidden?.type === 'variable'
        && component.hidden?.value
        && data[component.hidden.value] === true
      ) {
        return null;
      }

      let props = formatProps(component);

      props = { ...props, ...handleEvent(component) };

      return React.createElement(
        componentConfig[component.name]?.prod,
        {
          key: component.id,
          _id: component.id,
          _name: component.name,
          _execEventFlow: execEventFlow,
          ref: (ref) => { setComponentRef(component.id, ref); },
          ...component.props,
          ...props,
        },
        component.props.children || renderComponents(component.children || [])
      );

    })
  }

  return (
    <div>
      <React.Suspense fallback="loading...">
        {renderComponents(components)}
      </React.Suspense>
    </div>
  );
}

export default ProdStage;
