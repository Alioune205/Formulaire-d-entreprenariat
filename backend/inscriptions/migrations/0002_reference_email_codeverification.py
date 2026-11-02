from django.db import migrations, models


def conserver_anciennes_references(apps, schema_editor):
    """Les dossiers existants gardent la référence qu'ils ont déjà reçue (CIAT-AAAA-NNNN)."""
    Inscription = apps.get_model("inscriptions", "Inscription")
    for ins in Inscription.objects.all():
        ins.reference = f"CIAT-{ins.cree_le:%Y}-{ins.pk:04d}"
        ins.save(update_fields=["reference"])


class Migration(migrations.Migration):

    dependencies = [
        ("inscriptions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="inscription",
            name="email",
            field=models.EmailField(
                blank=True, max_length=254, verbose_name="e-mail du responsable",
                help_text="Sert à récupérer la référence du dossier en cas d'oubli.",
            ),
        ),
        migrations.AddField(
            model_name="inscription",
            name="reference",
            field=models.CharField(max_length=32, null=True, editable=False, verbose_name="référence"),
        ),
        migrations.RunPython(conserver_anciennes_references, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="inscription",
            name="reference",
            field=models.CharField(max_length=32, unique=True, editable=False, verbose_name="référence"),
        ),
        migrations.CreateModel(
            name="CodeVerification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("code_hache", models.CharField(max_length=128)),
                ("cree_le", models.DateTimeField(auto_now_add=True)),
                ("expire_le", models.DateTimeField()),
                ("tentatives", models.PositiveSmallIntegerField(default=0)),
                ("utilise", models.BooleanField(default=False)),
            ],
            options={
                "verbose_name": "code de vérification",
                "verbose_name_plural": "codes de vérification",
                "ordering": ["-cree_le"],
            },
        ),
    ]
