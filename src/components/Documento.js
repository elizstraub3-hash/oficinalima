export const soDigitos = v => String(v || '').replace(/\D/g, '')

export function tipoDoc(v) {
  return soDigitos(v).length > 11 ? 'CNPJ' : 'CPF'
}

export function formatarDoc(v, tipo) {
  const d = soDigitos(v).slice(0, (tipo || tipoDoc(v)) === 'CNPJ' ? 14 : 11)
  if ((tipo || tipoDoc(v)) === 'CNPJ') {
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
