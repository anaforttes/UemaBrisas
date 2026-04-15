export async function criarProcesso(data: any) {
  const response = await fetch('http://127.0.0.1:8000/api/processos/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const erro = await response.json();
    console.error(erro);
    throw new Error('Erro ao criar processo');
  }

  return response.json();
}