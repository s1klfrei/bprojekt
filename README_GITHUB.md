GROBER ABLAUF:

Aktuellen master-Branch vom Server downloaden 
(vorher mit git status sicherstellen, dass man sich auf dem master-Branch befindet. 
Wenn nicht: git checkout master):
git pull

Einen neuen Branch für das kommende Feature anlegen:
git checkout -b meinfeature master

[Änderungen am Code durchführen]

Geänderte und neue Dateien stagen:
git add .

Änderungen committen:
git commit -m „[commit nachricht(was wurde geändert)]“

Jetzt den Branch auf den Server laden, wenn gewünscht:
git push -u origin meinfeature

… oder direkt in den master wechseln:
git checkout master

(nochmals aktuellen Code ziehen – zur Sicherheit)
git pull

Eigenen Code mit master zusammenführen:
git merge meinfeature

Nicht mehr benötigten Branch löschen:
git branch -d meinfeature

Aktualisierten master auf den Server pushen:
git push https://github.com/s1klfrei/bprojekt.git

