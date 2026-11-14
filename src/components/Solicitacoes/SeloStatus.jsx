import { STATUS } from "../../services/solicitacoes";
import "./Solicitacoes.css";

const CLASSES = {
  AGUARDANDO_ACOMPANHAMENTO: "aguardando",
  EM_ANDAMENTO: "andamento",
  FINALIZADO: "finalizado",
};

export default function SeloStatus({ status, curto = false }) {
  const item = STATUS.find((s) => s.valor === status);
  return (
    <span className={`selo-status selo-status--${CLASSES[status] ?? "outro"}`}>
      {item ? (curto ? item.curto : item.rotulo) : status}
    </span>
  );
}

// Linha do tempo resumida das 3 etapas do fluxo da solicitação.
export function EtapasStatus({ status }) {
  const atual = STATUS.findIndex((s) => s.valor === status);
  return (
    <ol className="etapas-status" aria-label={`Andamento: ${STATUS[atual]?.rotulo ?? status}`}>
      {STATUS.map((etapa, indice) => {
        let estado = "pendente";
        if (indice < atual || (indice === atual && status === "FINALIZADO")) estado = "feita";
        else if (indice === atual) estado = "atual";
        return (
          <li key={etapa.valor} className={`etapas-status__item etapas-status__item--${estado}`}>
            <span className="etapas-status__marca" aria-hidden="true" />
            <span className="etapas-status__rotulo">{etapa.rotulo}</span>
          </li>
        );
      })}
    </ol>
  );
}
