// src/__tests__/SelectUI.test.tsx — cover select.jsx SelectLabel + SelectSeparator
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

// Radix portal/popper requires a full DOM — mock the portal to render inline
jest.mock('@radix-ui/react-select', () => {
  const React = require('react');
  const Root = ({ children }: any) => <div data-testid="select-root">{children}</div>;
  const Trigger = React.forwardRef(({ children, ...p }: any, ref: any) => <button ref={ref} {...p}>{children}</button>);
  const Value = ({ children, placeholder }: any) => <span>{children ?? placeholder}</span>;
  const Icon = ({ children }: any) => <span>{children}</span>;
  const Portal = ({ children }: any) => <div>{children}</div>;
  const Content = React.forwardRef(({ children, ...p }: any, ref: any) => <div ref={ref} data-testid="select-content" {...p}>{children}</div>);
  const Viewport = ({ children }: any) => <div>{children}</div>;
  const Group = ({ children }: any) => <div>{children}</div>;
  const Label = React.forwardRef(({ children, ...p }: any, ref: any) => <div ref={ref} data-testid="select-label" {...p}>{children}</div>);
  const Item = React.forwardRef(({ children, ...p }: any, ref: any) => <div ref={ref} {...p}>{children}</div>);
  const ItemText = ({ children }: any) => <span>{children}</span>;
  const ItemIndicator = ({ children }: any) => <span>{children}</span>;
  const Separator = React.forwardRef((p: any, ref: any) => <hr ref={ref} data-testid="select-separator" {...p} />);
  const ScrollUpButton = React.forwardRef((p: any, ref: any) => <div ref={ref} {...p} />);
  const ScrollDownButton = React.forwardRef((p: any, ref: any) => <div ref={ref} {...p} />);
  Trigger.displayName = 'SelectTrigger';
  Content.displayName = 'SelectContent';
  Label.displayName = 'SelectLabel';
  Item.displayName = 'SelectItem';
  Separator.displayName = 'SelectSeparator';
  ScrollUpButton.displayName = 'SelectScrollUpButton';
  ScrollDownButton.displayName = 'SelectScrollDownButton';
  return {
    Root, Trigger, Value, Icon, Portal, Content, Viewport, Group,
    Label, Item, ItemText, ItemIndicator, Separator, ScrollUpButton, ScrollDownButton,
  };
});

describe('Select UI components — SelectLabel and SelectSeparator', () => {
  it('renders SelectLabel with text', () => {
    render(
      <Select>
        <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Dairy Platforms</SelectLabel>
            <SelectItem value="a">Option A</SelectItem>
            <SelectSeparator />
            <SelectItem value="b">Option B</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText('Dairy Platforms')).toBeInTheDocument();
    expect(screen.getByTestId('select-separator')).toBeInTheDocument();
  });
});
