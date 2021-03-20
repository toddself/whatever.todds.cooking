for (const post of Array.toArray(document.querySelectorAll('.post'))) {
  const url = post.dataset.canonical
  const title = post.querySelector('h2')
  const a = document.createElement('a')
  a.href = url
  a.innerHTML = title.innerHTML
  title.innerHTML = ""
  title.appendChild(a)
}
