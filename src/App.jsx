import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login/Login";
import Home from "./pages/Home/Home";
import AlunoFicha from "./pages/AlunoFicha/AlunoFicha";
import AdminUsuarios from "./pages/AdminUsuarios/AdminUsuarios";
import Solicitacoes from "./pages/Solicitacoes/Solicitacoes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/alunos/novo" element={<AlunoFicha />} />
        <Route path="/alunos/:id" element={<AlunoFicha />} />
        <Route path="/admin/usuarios" element={<AdminUsuarios />} />
        <Route path="/solicitacoes" element={<Solicitacoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

  /* 
npm install react-router-dom */