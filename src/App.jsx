import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login/Login";
import Home from "./pages/Home/Home";
import AlunoFicha from "./pages/AlunoFicha/AlunoFicha";
import AdminUsuarios from "./pages/AdminUsuarios/AdminUsuarios";
import Solicitacoes from "./pages/Solicitacoes/Solicitacoes";
import Atendimentos from "./pages/Atendimentos/Atendimentos";
import Ocorrencias from "./pages/Ocorrencias/Ocorrencias";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/alunos/novo" element={<AlunoFicha />} />
        <Route path="/alunos/:id" element={<AlunoFicha />} />
        <Route path="/admin" element={<AdminUsuarios />} />
        <Route path="/admin/usuarios" element={<Navigate to="/admin?aba=usuarios" replace />} />
        <Route path="/solicitacoes" element={<Solicitacoes />} />
        <Route path="/atendimentos" element={<Atendimentos />} />
        <Route path="/ocorrencias" element={<Ocorrencias />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

  /* 
npm install react-router-dom */