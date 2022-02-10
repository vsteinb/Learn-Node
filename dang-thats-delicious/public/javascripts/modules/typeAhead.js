import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHtml(stores) {
    return stores.map((store, i) => `
        <a href="/store/${store.slug}" class="search__result">
            <strong>${store.name}</strong>
        </a>
    `).join('');
}

function typeAhead(search) {
    if (!search) { return; }

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');

    searchInput.on('input', function() {
        if (!this.value) {
            return searchResults.style.display = 'none';
        }
        
        searchResults.style.display = 'block';
        searchResults.innerHTML = '';

        axios.get(`/api/v1/search?q=${this.value}`)
        .then(res => {
            if (res.data.length) {
                return searchResults.innerHTML = dompurify.sanitize(searchResultsHtml(res.data));
            }
            searchResults.innerHTML = dompurify.sanitize(`
            <div class="search__result">
                <strong>No results</strong> for <strong>${this.value}</strong> found!
            </div>`);
        })
        .catch(err => console.error(err));
        
    });

    // handle keyboard inputs
    searchInput.on('keyup', ({keyCode}) => {
        // ignore all except up, down, enter
        if (![38, 40, 13].includes(keyCode) || !searchResults.children.length) { return; }
        
        const activeClass = 'search__result--active';
        const activeElement = searchResults.querySelector(`.${activeClass}`);

        // enter
        if (keyCode === 13) {
            return activeElement.click();
        }

        // get resources
        const results = [...searchResults.children];
        const index = results.findIndex(tag => tag.classList.contains(activeClass));

        // remove active from current element
        if (index !== -1) { results[index].classList.remove(activeClass); }

        // up
        if (keyCode === 38) {
            return results[(Math.max(index-1, -1)+results.length) % results.length].classList.add(activeClass);
        }

        // down
        if (keyCode === 40) {
            return results[(index+1) % results.length].classList.add(activeClass);
        }
    });
}

export default typeAhead;