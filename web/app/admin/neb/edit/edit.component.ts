import { Component, OnDestroy, OnInit } from "@angular/core";
import { FE_NebConfiguration } from "../../../shared/models/admin_responses";
import { AdminNebApiService } from "../../../shared/services/admin/admin-neb-api.service";
import { ActivatedRoute } from "@angular/router";
import { ToasterService } from "angular2-toaster";
import { FE_Integration } from "../../../shared/models/integration";
import { NEB_HAS_CONFIG } from "../../../shared/models/neb";


@Component({
    templateUrl: "./edit.component.html",
    styleUrls: ["./edit.component.scss"],
})
export class AdminEditNebComponent implements OnInit, OnDestroy {

    public isLoading = true;
    public isUpdating = false;
    public isUpstream = false;
    public nebConfig: FE_NebConfiguration;

    private subscription: any;
    private overlappingTypes: string[] = [];

    constructor(private nebApi: AdminNebApiService, private route: ActivatedRoute, private toaster: ToasterService) {
    }

    public ngOnInit() {
        this.subscription = this.route.params.subscribe(params => {
            this.loadNeb(Number(params["nebId"]));
        });
    }

    public ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    public isOverlapping(bot: FE_Integration) {
        return this.overlappingTypes.indexOf(bot.type) !== -1;
    }

    public hasConfig(bot: FE_Integration): boolean {
        return NEB_HAS_CONFIG.indexOf(bot.type) !== -1;
    }

    public async toggleBot(bot: FE_Integration) {
        bot.isEnabled = !bot.isEnabled;
        this.isUpdating = true;

        try {
            await this.nebApi.toggleIntegration(this.nebConfig.id, bot.type, bot.isEnabled);
            this.isUpdating = false;
            this.toaster.pop("success", "Integration updated");
        } catch (err) {
            console.error(err);
            bot.isEnabled = !bot.isEnabled; // revert change
            this.isUpdating = false;
            this.toaster.pop("error", "Error updating integration");
            return;
        }

        // Only update the service configuration if
        if (bot.isEnabled) {
            if (this.hasConfig(bot)) {
                this.editBot(bot);
            } else {
                try {
                    await this.nebApi.setIntegrationConfiguration(this.nebConfig.id, bot.type, {});
                } catch (err) {
                    console.error(err);
                    this.toaster.pop("warning", "Failed to configure the integration", "Manual troubleshooting may be requred");
                    return;
                }
            }
        }
    }

    public editBot(bot: FE_Integration) {
        console.log(bot);
    }

    private loadNeb(nebId: number) {
        this.isLoading = true;
        this.nebApi.getConfigurations().then(configs => {
            const handledTypes: string[] = [];
            for (const config of configs) {
                if (config.id === nebId) {
                    this.nebConfig = config;
                } else {
                    for (const type of config.integrations) {
                        if (type.isEnabled) handledTypes.push(type.type);
                    }
                }
            }

            this.overlappingTypes = handledTypes;
            this.isUpstream = !!this.nebConfig.upstreamId;
            this.isLoading = false;
        }).catch(err => {
            console.error(err);
            this.toaster.pop('error', "Could not get go-neb configuration");
        });
    }
}
