export function somenteDigitos(valor = "") {
  return valor.replace(/\D/g, "");
}

export function mascaraCpf(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function mascaraCep(valor) {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// (16) 3333-4444 para fixo (10 dígitos) e (16) 99999-8888 para celular (11).
export function mascaraTelefone(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const numero = d.slice(2);
  const corte = d.length === 11 ? 5 : 4;
  if (numero.length <= corte) return `(${ddd}) ${numero}`;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

export function cpfValido(valor) {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function emailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

// Data local no formato YYYY-MM-DD (usado como `max` do input date).
export function hojeIso() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// "2026-11-14T15:30:00" -> "14/11/2026 às 15:30" (horário local).
export function formatarDataHora(iso) {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const dia = data.toLocaleDateString("pt-BR");
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${dia} às ${hora}`;
}

// "2026-11-14T15:30:00" -> "14/11/2026".
export function formatarData(iso) {
  if (!iso) return "";
  const data = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}
