export async function buscarDashboard() {
  const resposta = await fetch("http://127.0.0.1:8000/api/painel/dashboard/");

  if (!resposta.ok) {
    throw new Error("Erro ao buscar dados do painel");
  }

  return resposta.json();
}
export async function criarProcesso(data: any) {
  const response = await fetch('http://127.0.0.1:8000/api/processos/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.log('ERRO BACKEND:', responseData);
    throw new Error(JSON.stringify(responseData));
  }

  return responseData;
}