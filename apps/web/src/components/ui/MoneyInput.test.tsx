import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { MoneyInput } from './MoneyInput';

function Harness() {
  const [value, setValue] = useState<number>(0);
  return (
    <>
      <MoneyInput label="Valor" value={value} onChange={setValue} />
      <output>{value}</output>
    </>
  );
}

const normalize = (text: string) => text.replace(/\s/g, ' ');

describe('MoneyInput', () => {
  it('digita da direita para a esquerda, em centavos', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Valor');

    await userEvent.type(input, '1250');

    expect(normalize((input as HTMLInputElement).value)).toBe('R$ 12,50');
    expect(screen.getByRole('status')).toHaveTextContent('1250');
  });

  it('apaga o último dígito com backspace', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Valor');

    await userEvent.type(input, '1250{Backspace}');

    expect(normalize((input as HTMLInputElement).value)).toBe('R$ 1,25');
  });

  it('ignora letras', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Valor');

    await userEvent.type(input, '9a9');

    expect(screen.getByRole('status')).toHaveTextContent('99');
  });
});
