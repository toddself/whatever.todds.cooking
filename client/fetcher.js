export async function fetcher() {
  const res = await fetch('/posts.json')
  const posts = await res.json()
  const content = document.querySelector('.content')

  for (const post of posts) {
    const obj = document.createElement('div')

    obj.classList.add('post')
    const title = document.createElement('h2')
    title.innerHTML = post.title
    obj.appendChild(title)

    const body = document.createElement('div')
    body.innerHTML = post.body
    obj.appendChild(body)

    const posted = document.createElement('time')
    posted.style.paddingTop = '.5rem'
    posted.style.display = 'block'
    posted.dateTime = post.posted
    const d = new Date(post.posted)
    const fmt = new Intl.DateTimeFormat('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
    posted.innerHTML = fmt.format(d)
    obj.appendChild(posted)
    content.appendChild(obj)
  }
}

fetcher()
  .catch(err => console.log(err))
